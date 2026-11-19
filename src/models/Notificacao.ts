import { connection } from "../infra/Connection";

export class Notificacao {
    static async criarSolicitacaoVinculo(
        fkUsuario: number,
        titulo: string,
        conteudo: string,
        idVinculo: number
    ) {
        await connection.query(
            `INSERT INTO notificacao
             (fkusuario, titulo, conteudo, tipo, referencia_id)
             VALUES ($1, $2, $3, 'solicitacao_vinculo', $4)
             ON CONFLICT (fkusuario, tipo, referencia_id)
             WHERE tipo IS NOT NULL AND referencia_id IS NOT NULL
             DO NOTHING`,
            [fkUsuario, titulo, conteudo, idVinculo]
        );
    }

    static async listarDoUsuario(fkUsuario: number) {
        const [notificacoes, naoLidas] = await Promise.all([
            connection.query(
                `SELECT id, titulo, conteudo, criado_em, lida_em,
                        COALESCE(tipo, '') AS tipo,
                        referencia_id
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

    static async marcarComoLidaPorReferencia(idReferencia: number, fkUsuario: number, tipo: string) {
        await connection.query(
            `UPDATE notificacao
             SET lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP)
             WHERE fkusuario = $1 AND tipo = $2 AND referencia_id = $3`,
            [fkUsuario, tipo, idReferencia]
        );
    }

    static async marcarSelecionadasComoLidas(ids: number[], fkUsuario: number) {
        await connection.query(
            `UPDATE notificacao
             SET lida_em = CURRENT_TIMESTAMP
             WHERE fkusuario = $1 AND id = ANY($2::integer[]) AND lida_em IS NULL`,
            [fkUsuario, ids]
        );
    }

    static async excluirSelecionadas(ids: number[], fkUsuario: number) {
        await connection.query(
            `DELETE FROM notificacao
             WHERE fkusuario = $1 AND id = ANY($2::integer[])`,
            [fkUsuario, ids]
        );
    }
}
