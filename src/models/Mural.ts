import { connection } from "../infra/Connection";

export class Mural {
    id: number;
    fkUsuario: number;

    constructor({ id, fkUsuario }: { id: number, fkUsuario: number }) {
        this.id = id;
        this.fkUsuario = fkUsuario;
    }

    static async buscarPorUsuario(fkUsuario: number) {
        const { rows } = await connection.query(
            `SELECT id, fkUsuario FROM Mural WHERE fkUsuario = $1`,
            [fkUsuario]
        );

        if (!rows[0]) {
            return null;
        }

        return new Mural({ id: rows[0].id, fkUsuario: rows[0].fkusuario });
    }

    static async buscarOuCriarPorUsuario(fkUsuario: number) {
        const { rows } = await connection.query(
            `INSERT INTO Mural(fkUsuario)
             VALUES ($1)
             ON CONFLICT (fkUsuario) DO UPDATE SET fkUsuario = EXCLUDED.fkUsuario
             RETURNING id, fkUsuario`,
            [fkUsuario]
        );

        return new Mural({ id: rows[0].id, fkUsuario: rows[0].fkusuario });
    }
}
