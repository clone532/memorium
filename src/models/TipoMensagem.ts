import { connection } from "../infra/Connection";

export class TipoMensagem {
    id?: number;
    nomeTipo: string;

    constructor({ id, nomeTipo }: { id?: number, nomeTipo: string }) {
        this.id = id;
        this.nomeTipo = nomeTipo;
    }

    //CRUD

    static async cadastrarTipoMensagem(tipoMensagem: TipoMensagem) {
        await connection.query(`INSERT INTO tipoMensagem(nomeTipo) VALUES ($1);`,
            [
                tipoMensagem.nomeTipo
            ]
        );
    }

    static async listarTiposMensagem() {
        const result = await connection.query(`
            SELECT id, nomeTipo AS "nomeTipo"
            FROM tipoMensagem
            ORDER BY id;
        `);

        return result.rows.map((row: any) => ({
            id: row.id,
            nomeTipo: row.nomeTipo
        }));
    }

    static async buscarTipoPorId(id: string) {
        const { rows } = await connection.query(`
            SELECT id, nomeTipo AS "nomeTipo"
            FROM tipoMensagem
            WHERE id = $1;
        `, [id]);

        if (!rows[0]) return null;

        return new TipoMensagem({
            id: rows[0].id,
            nomeTipo: rows[0].nomeTipo
        });
    }

    static async editarTipoMensagem(tipoMensagem: TipoMensagem) {
        await connection.query(`UPDATE tipoMensagem SET nomeTipo = $1 WHERE id = $2;`,
            [
                tipoMensagem.nomeTipo,
                tipoMensagem.id
            ]
        );
    }

    static async deletarPorId(id: string): Promise<boolean> {
        try {
            const result = await connection.query(`
                DELETE FROM tipoMensagem AS tm
                WHERE tm.id = $1
                  AND NOT EXISTS (
                    SELECT 1 FROM Mensagem m WHERE m.idTipoMensagem = tm.id
                  )
                RETURNING tm.id;
            `, [id]);

            return result.rowCount === 1;
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === '23503'
            ) {
                return false;
            }

            throw error;
        }
    }

    static async buscarTipoPorNome(nomeTipo: string) {
        const { rows } = await connection.query(
            `SELECT tipoMensagem.id, tipoMensagem.nomeTipo AS "nomeTipo"
            FROM tipoMensagem WHERE nomeTipo = $1;`, [nomeTipo]);
        if (!rows[0]) {
            return null;
        }

        return new TipoMensagem({
            id: rows[0].id,
            nomeTipo: rows[0].nomeTipo
        });
    }
}