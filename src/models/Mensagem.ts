import { connection } from "../infra/Connection";

export type NovaMensagem = {
    fkUsuario: number;
    titulo: string;
    conteudo: string;
    dataEnvio: Date | null;
    destinatarios: number[];
    anexos: Array<{
        nomeOriginal: string;
        caminhoPrivado: string;
        tipoMime: string;
        tamanhoBytes: number;
    }>;
};

export class Mensagem {
    static async listarDoUsuario(fkUsuario: number) {
        const { rows } = await connection.query(
            `SELECT m.id, m.titulo, m.conteudo, m.data_envio, m.status,
                    m.criado_em, m.enviado_em,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'id', d.id, 'nome', d.nome, 'email', d.email,
                            'status', dm.status_envio
                        ))
                         FROM destinatario_mensagem dm
                         JOIN destinatario d
                           ON d.id = dm.fkdestinatario AND d.fkusuario = m.fkusuario
                         WHERE dm.fkmensagem = m.id AND dm.fkusuario = m.fkusuario),
                        '[]'::json
                    ) AS destinatarios,
                    COALESCE(
                        (SELECT json_agg(json_build_object(
                            'nome', a.nome_original,
                            'tipo', a.tipo_mime,
                            'tamanho', a.tamanho_bytes
                        ))
                         FROM anexo_mensagem a
                         WHERE a.fkmensagem = m.id),
                        '[]'::json
                    ) AS anexos
             FROM mensagem m
             WHERE m.fkusuario = $1 AND m.status <> 'legada'
             GROUP BY m.id
             ORDER BY m.criado_em DESC`,
            [fkUsuario]
        );
        return rows;
    }

    static async criar(nova: NovaMensagem) {
        const client = await connection.connect();
        try {
            await client.query("BEGIN");
            const usuario = await client.query(
                `SELECT estamorto FROM usuario WHERE id = $1 FOR UPDATE`,
                [nova.fkUsuario]
            );
            if (!usuario.rows[0]) {
                throw new Error("USUARIO_NAO_ENCONTRADO");
            }

            const destinatarios = await client.query(
                `SELECT id FROM destinatario
                 WHERE fkusuario = $1 AND id = ANY($2::integer[])`,
                [nova.fkUsuario, nova.destinatarios]
            );
            if (destinatarios.rows.length !== nova.destinatarios.length) {
                throw new Error("DESTINATARIO_INVALIDO");
            }

            const status = nova.dataEnvio
                ? 'agendada'
                : usuario.rows[0].estamorto ? 'pronta_para_envio' : 'aguardando_confirmacao';
            const inserida = await client.query(
                `INSERT INTO mensagem (titulo, conteudo, fkusuario, data_envio, status)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [nova.titulo, nova.conteudo, nova.fkUsuario, nova.dataEnvio, status]
            );
            const idMensagem = inserida.rows[0].id;

            for (const idDestinatario of nova.destinatarios) {
                await client.query(
                    `INSERT INTO destinatario_mensagem (fkmensagem, fkdestinatario, fkusuario)
                     VALUES ($1, $2, $3)`,
                    [idMensagem, idDestinatario, nova.fkUsuario]
                );
            }

            for (const anexo of nova.anexos) {
                await client.query(
                    `INSERT INTO anexo_mensagem
                     (fkmensagem, nome_original, caminho_privado, tipo_mime, tamanho_bytes)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [idMensagem, anexo.nomeOriginal, anexo.caminhoPrivado, anexo.tipoMime, anexo.tamanhoBytes]
                );
            }

            await client.query("COMMIT");
            return idMensagem as number;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async deletarDoUsuario(idMensagem: number, fkUsuario: number) {
        const client = await connection.connect();
        try {
            await client.query("BEGIN");
            const mensagem = await client.query(
                `SELECT id, status
                 FROM mensagem
                 WHERE id = $1 AND fkusuario = $2
                 FOR UPDATE`,
                [idMensagem, fkUsuario]
            );
            if (!mensagem.rows[0]) {
                throw new Error("MENSAGEM_NAO_ENCONTRADA");
            }

            const entregas = await client.query(
                `SELECT 1
                 FROM destinatario_mensagem
                 WHERE fkmensagem = $1
                   AND status_envio IN ('enviando', 'enviado')
                 LIMIT 1`,
                [idMensagem]
            );
            if (
                ['enviando', 'enviada', 'parcialmente_enviada'].includes(mensagem.rows[0].status)
                || entregas.rows.length > 0
            ) {
                throw new Error("MENSAGEM_JA_ENVIADA");
            }

            const anexos = await client.query(
                `SELECT caminho_privado FROM anexo_mensagem WHERE fkmensagem = $1`,
                [idMensagem]
            );
            await client.query(`DELETE FROM destinatario_mensagem WHERE fkmensagem = $1`, [idMensagem]);
            await client.query(
                `DELETE FROM mensagem WHERE id = $1 AND fkusuario = $2`,
                [idMensagem, fkUsuario]
            );
            await client.query("COMMIT");
            return anexos.rows.map((anexo) => anexo.caminho_privado as string);
        } catch (error) {
            await client.query("ROLLBACK");
            if (
                error && typeof error === "object"
                && "code" in error && error.code === "23503"
            ) {
                throw new Error("MENSAGEM_VINCULADA");
            }
            throw error;
        } finally {
            client.release();
        }
    }
}
