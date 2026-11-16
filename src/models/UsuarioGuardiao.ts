import { connection } from "../infra/Connection";

type ConviteGuardiao = {
    id: number;
    nomeGuardiao: string;
    nomeUsuario: string;
};

export class UsuarioGuardiao {
    id?: number;
    idUsuario: number;
    idGuardiao: number;
    votoConfirma: boolean = false;
    chave: string;

    constructor({ id, idUsuario, idGuardiao, votoConfirma, chave }: { id?: number, idUsuario: number, idGuardiao: number, votoConfirma: boolean, chave: string }) {
        this.id = id;
        this.idUsuario = idUsuario;
        this.idGuardiao = idGuardiao;
        this.votoConfirma = votoConfirma;
        this.chave = chave;
    }

    static async criarConexao(usuarioGuardiao: UsuarioGuardiao) {
        if (
            !Number.isSafeInteger(usuarioGuardiao.idUsuario)
            || usuarioGuardiao.idUsuario <= 0
            || !Number.isSafeInteger(usuarioGuardiao.idGuardiao)
            || usuarioGuardiao.idGuardiao <= 0
            || !usuarioGuardiao.chave.trim()
        ) {
            throw new Error("Os dados do vínculo de guardião são inválidos.");
        }

        await connection.query(`INSERT INTO usuario_guardiao(idusuario, idguardiao, chave) VALUES ($1, $2, $3);`, 
            [
                usuarioGuardiao.idUsuario,
                usuarioGuardiao.idGuardiao,
                usuarioGuardiao.chave
            ]
        );
    }

    static async cancelarConexao(id: number) {
        await connection.query(`DELETE FROM usuario_guardiao WHERE id = $1;`,
            [
                id
            ]
        );
    }

    static async buscar(idUsuario: number, idGuardiao: number) {
        const { rows } = await connection.query(`SELECT 1 FROM usuario_guardiao WHERE idGuardiao = $1 AND idUsuario = $2 LIMIT 1;`,
            [
                idGuardiao,
                idUsuario
            ]
        );

        return rows.length > 0;
    }

    static async prepararConvite(
        idUsuario: number,
        guardiao: { nome: string; email: string; numero: string },
        tokenHash: string
    ): Promise<'pendente' | 'confirmado'> {
        const client = await connection.connect();

        try {
            await client.query("BEGIN");
            await client.query(
                "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
                [guardiao.email.toLowerCase(), guardiao.numero.trim()]
            );

            const guardiaoExistente = await client.query(
                `SELECT id FROM guardiao
                 WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))
                   AND BTRIM(numero) = BTRIM($2)
                 LIMIT 1
                 FOR UPDATE`,
                [guardiao.email, guardiao.numero]
            );

            let idGuardiao: number;
            if (guardiaoExistente.rows[0]) {
                idGuardiao = guardiaoExistente.rows[0].id;
            } else {
                const novoGuardiao = await client.query(
                    `INSERT INTO guardiao(nome, email, numero)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [guardiao.nome, guardiao.email, guardiao.numero]
                );
                idGuardiao = novoGuardiao.rows[0].id;
            }

            const vinculo = await client.query(
                `SELECT id, estado_vinculo
                 FROM usuario_guardiao
                 WHERE idusuario = $1 AND idguardiao = $2
                 FOR UPDATE`,
                [idUsuario, idGuardiao]
            );

            if (vinculo.rows[0]?.estado_vinculo === 'confirmado') {
                await client.query("COMMIT");
                return 'confirmado';
            }

            if (vinculo.rows[0]) {
                await client.query(
                    `UPDATE usuario_guardiao
                     SET estado_vinculo = 'pendente',
                         token_vinculo_hash = $1,
                         token_vinculo_expira_em = CURRENT_TIMESTAMP + INTERVAL '7 days',
                         convite_enviado_em = NULL
                     WHERE id = $2`,
                    [tokenHash, vinculo.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO usuario_guardiao
                     (idusuario, idguardiao, estado_vinculo, token_vinculo_hash, token_vinculo_expira_em)
                     VALUES ($1, $2, 'pendente', $3, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
                    [idUsuario, idGuardiao, tokenHash]
                );
            }

            await client.query("COMMIT");
            return 'pendente';
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async marcarConviteEnviado(tokenHash: string) {
        const result = await connection.query(
            `UPDATE usuario_guardiao
             SET convite_enviado_em = CURRENT_TIMESTAMP
             WHERE token_vinculo_hash = $1
               AND estado_vinculo = 'pendente'
               AND token_vinculo_expira_em > CURRENT_TIMESTAMP`,
            [tokenHash]
        );
        return result.rowCount === 1;
    }

    static async buscarConviteValido(tokenHash: string): Promise<ConviteGuardiao | null> {
        const { rows } = await connection.query(
            `SELECT ug.id, g.nome AS nome_guardiao, u.nome AS nome_usuario
             FROM usuario_guardiao ug
             JOIN guardiao g ON g.id = ug.idguardiao
             JOIN usuario u ON u.id = ug.idusuario
             WHERE ug.token_vinculo_hash = $1
               AND ug.estado_vinculo = 'pendente'
               AND ug.token_vinculo_expira_em > CURRENT_TIMESTAMP`,
            [tokenHash]
        );

        if (!rows[0]) {
            return null;
        }

        return {
            id: rows[0].id,
            nomeGuardiao: rows[0].nome_guardiao,
            nomeUsuario: rows[0].nome_usuario
        };
    }

    static async confirmarConvite(tokenHash: string) {
        const result = await connection.query(
            `UPDATE usuario_guardiao
             SET estado_vinculo = 'confirmado',
                 vinculo_confirmado_em = CURRENT_TIMESTAMP,
                 token_vinculo_hash = NULL,
                 token_vinculo_expira_em = NULL
             WHERE token_vinculo_hash = $1
               AND estado_vinculo = 'pendente'
               AND token_vinculo_expira_em > CURRENT_TIMESTAMP`,
            [tokenHash]
        );
        return result.rowCount === 1;
    }

}