import { connection } from "../infra/Connection";

export class Notificacao {
    static async listarDoUsuario(fkUsuario: number) {
        const [notificacoes, naoLidas] = await Promise.all([
            connection.query(
                `SELECT id, titulo, conteudo, criado_em, lida_em
                 FROM notificacao
                 WHERE fkusuario = $1
                 ORDER BY criado_em DESC
                 LIMIT 20`,
                [fkUsuario]
            ),
            connection.query(
                `SELECT COUNT(*)::int AS quantidade
                 FROM notificacao
                 WHERE fkusuario = $1 AND lida_em IS NULL`,
                [fkUsuario]
            )
        ]);
        return {
            notificacoes: notificacoes.rows,
            naoLidas: naoLidas.rows[0].quantidade as number
        };
    }

    static async marcarComoLida(id: number, fkUsuario: number) {
        const resultado = await connection.query(
            `UPDATE notificacao
             SET lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP)
             WHERE id = $1 AND fkusuario = $2
             RETURNING id`,
            [id, fkUsuario]
        );
        return resultado.rows.length > 0;
    }
}
