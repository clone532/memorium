import { createHash, randomBytes } from "crypto";
import { connection } from "../infra/Connection";

type ConviteConfirmacao = {
    email: string;
    nome: string;
    token: string;
};

type ResultadoSolicitacao =
    | { estado: 'usuario_invalido' | 'guardiao_nao_vinculado' | 'falecimento_ja_confirmado'; confirmacoesNecessarias?: number }
    | { estado: 'guardioes_insuficientes'; confirmacoesNecessarias: number }
    | { estado: 'aguardando_confirmacoes'; id: number; convites: ConviteConfirmacao[] };

type ResultadoConfirmacao =
    | { estado: 'invalida' }
    | { estado: 'aguardando_confirmacoes'; confirmacoes: number; necessarias: number }
    | { estado: 'confirmada'; confirmacoes: number };

type ConviteFalecimento = {
    nomeGuardiao: string;
    nomeUsuario: string;
};

export class SolicitacaoFalecimento {
    static async iniciar(idUsuario: number, idVinculoIniciador: number): Promise<ResultadoSolicitacao> {
        const client = await connection.connect();

        try {
            await client.query("BEGIN");
            const usuario = await client.query(
                `SELECT estamorto FROM usuario WHERE id = $1 FOR UPDATE`,
                [idUsuario]
            );
            if (!usuario.rows[0]) {
                await client.query("COMMIT");
                return { estado: 'usuario_invalido' };
            }
            if (usuario.rows[0].estamorto) {
                await client.query("COMMIT");
                return { estado: 'falecimento_ja_confirmado' };
            }

            const iniciador = await client.query(
                `SELECT id FROM usuario_guardiao
                 WHERE id = $1 AND idusuario = $2 AND estado_vinculo = 'confirmado'
                 FOR UPDATE`,
                [idVinculoIniciador, idUsuario]
            );
            if (!iniciador.rows[0]) {
                await client.query("COMMIT");
                return { estado: 'guardiao_nao_vinculado' };
            }

            const guardioes = await client.query(
                `SELECT ug.id, g.email, g.nome
                 FROM usuario_guardiao ug
                 JOIN guardiao g ON g.id = ug.idguardiao
                 WHERE ug.idusuario = $1 AND ug.estado_vinculo = 'confirmado'
                 ORDER BY ug.id`,
                [idUsuario]
            );
            if (guardioes.rows.length < 3) {
                await client.query("COMMIT");
                return {
                    estado: 'guardioes_insuficientes',
                    confirmacoesNecessarias: 3
                };
            }

            let solicitacao = await client.query(
                `SELECT id, confirmacoes_necessarias
                 FROM solicitacao_falecimento
                 WHERE fkusuario = $1 AND status = 'aguardando_confirmacoes'
                 FOR UPDATE`,
                [idUsuario]
            );
            let idSolicitacao: number;
            let confirmacoesNecessarias = 3;

            if (solicitacao.rows[0]) {
                idSolicitacao = solicitacao.rows[0].id;
                confirmacoesNecessarias = solicitacao.rows[0].confirmacoes_necessarias;
            } else {
                solicitacao = await client.query(
                    `INSERT INTO solicitacao_falecimento (fkusuario, iniciado_por_vinculo)
                     VALUES ($1, $2)
                     RETURNING id, confirmacoes_necessarias`,
                    [idUsuario, idVinculoIniciador]
                );
                idSolicitacao = solicitacao.rows[0].id;
                confirmacoesNecessarias = solicitacao.rows[0].confirmacoes_necessarias;
            }

            const convites: ConviteConfirmacao[] = [];
            for (const guardiao of guardioes.rows) {
                const votoExistente = await client.query(
                    `SELECT id, confirmado_em
                     FROM confirmacao_falecimento
                     WHERE fksolicitacao = $1 AND fkusuarioguardiao = $2
                     FOR UPDATE`,
                    [idSolicitacao, guardiao.id]
                );
                if (votoExistente.rows[0]?.confirmado_em) {
                    continue;
                }

                const token = randomBytes(32).toString('hex');
                const tokenHash = createHash('sha256').update(token).digest('hex');
                if (votoExistente.rows[0]) {
                    await client.query(
                        `UPDATE confirmacao_falecimento
                         SET token_hash = $1, expira_em = CURRENT_TIMESTAMP + INTERVAL '7 days'
                         WHERE id = $2`,
                        [tokenHash, votoExistente.rows[0].id]
                    );
                } else {
                    await client.query(
                        `INSERT INTO confirmacao_falecimento
                         (fksolicitacao, fkusuarioguardiao, token_hash, expira_em)
                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
                        [idSolicitacao, guardiao.id, tokenHash]
                    );
                }
                convites.push({
                    email: guardiao.email,
                    nome: guardiao.nome,
                    token
                });
            }

            await client.query("COMMIT");
            return {
                estado: 'aguardando_confirmacoes',
                id: idSolicitacao,
                convites
            };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async buscarConvite(tokenHash: string): Promise<ConviteFalecimento | null> {
        const { rows } = await connection.query(
            `SELECT g.nome AS nome_guardiao, u.nome AS nome_usuario
             FROM confirmacao_falecimento cf
             JOIN solicitacao_falecimento sf ON sf.id = cf.fksolicitacao
             JOIN usuario_guardiao ug ON ug.id = cf.fkusuarioguardiao
             JOIN guardiao g ON g.id = ug.idguardiao
             JOIN usuario u ON u.id = sf.fkusuario
             WHERE cf.token_hash = $1
               AND cf.confirmado_em IS NULL
               AND cf.expira_em > CURRENT_TIMESTAMP
               AND sf.status = 'aguardando_confirmacoes'
               AND ug.estado_vinculo = 'confirmado'`,
            [tokenHash]
        );

        if (!rows[0]) {
            return null;
        }

        return {
            nomeGuardiao: rows[0].nome_guardiao,
            nomeUsuario: rows[0].nome_usuario
        };
    }

    static async confirmar(tokenHash: string): Promise<ResultadoConfirmacao> {
        const client = await connection.connect();

        try {
            await client.query("BEGIN");
            const voto = await client.query(
                `SELECT cf.id, cf.fksolicitacao, sf.fkusuario,
                        sf.confirmacoes_necessarias, sf.status, ug.estado_vinculo
                 FROM confirmacao_falecimento cf
                 JOIN solicitacao_falecimento sf ON sf.id = cf.fksolicitacao
                 JOIN usuario_guardiao ug ON ug.id = cf.fkusuarioguardiao
                 WHERE cf.token_hash = $1
                   AND cf.confirmado_em IS NULL
                   AND cf.expira_em > CURRENT_TIMESTAMP
                   AND sf.status = 'aguardando_confirmacoes'
                   AND ug.estado_vinculo = 'confirmado'
                 FOR UPDATE OF cf, sf, ug`,
                [tokenHash]
            );

            if (!voto.rows[0]) {
                await client.query("COMMIT");
                return { estado: 'invalida' };
            }

            const registro = voto.rows[0];
            await client.query(
                `UPDATE confirmacao_falecimento
                 SET confirmado_em = CURRENT_TIMESTAMP
                 WHERE id = $1 AND confirmado_em IS NULL`,
                [registro.id]
            );

            const total = await client.query(
                `SELECT COUNT(DISTINCT cf.fkusuarioguardiao)::int AS quantidade
                 FROM confirmacao_falecimento cf
                 JOIN usuario_guardiao ug ON ug.id = cf.fkusuarioguardiao
                 WHERE cf.fksolicitacao = $1
                   AND cf.confirmado_em IS NOT NULL
                   AND ug.estado_vinculo = 'confirmado'`,
                [registro.fksolicitacao]
            );
            const confirmacoes = total.rows[0].quantidade as number;

            if (confirmacoes < registro.confirmacoes_necessarias) {
                await client.query("COMMIT");
                return {
                    estado: 'aguardando_confirmacoes',
                    confirmacoes,
                    necessarias: registro.confirmacoes_necessarias
                };
            }

            await client.query(
                `UPDATE solicitacao_falecimento
                 SET status = 'confirmada', confirmado_em = CURRENT_TIMESTAMP
                 WHERE id = $1 AND status = 'aguardando_confirmacoes'`,
                [registro.fksolicitacao]
            );
            await client.query(
                `UPDATE usuario SET estamorto = TRUE WHERE id = $1`,
                [registro.fkusuario]
            );
            await client.query(
                `UPDATE mensagem
                 SET status = 'pronta_para_envio'
                 WHERE fkusuario = $1
                   AND data_envio IS NULL
                   AND status = 'aguardando_confirmacao'`,
                [registro.fkusuario]
            );

            await client.query("COMMIT");
            return { estado: 'confirmada', confirmacoes };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}
