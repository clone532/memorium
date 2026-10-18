import { connection } from "../infra/Connection";
import { Mural } from "./Mural";
import { Usuario } from "./Usuario";

export class Comentario {
    id?: number;
    dataHora: Date;
    conteudo: string;
    fkMural: Mural;
    fkUsuario: Usuario;

    constructor({ id, dataHora, conteudo, fkMural, fkUsuario }: { id?: number, dataHora: Date, conteudo: string, fkMural: Mural, fkUsuario: Usuario }) {
        this.id = id;
        this.dataHora = dataHora;
        this.conteudo = conteudo;
        this.fkMural = fkMural;
        this.fkUsuario = fkUsuario;
    }

    static async criarComentario(comentario: Comentario) {
        await connection.query(`
            INSERT INTO Comentario(dataHora, conteudo, fkMural, fkUsuario)

            VALUES ($1, $2, $3, $4);
            `,
        [
            comentario.dataHora,
            comentario.conteudo,
            comentario.fkMural.id,
            comentario.fkUsuario.id
        ]
    );
    }

    static async deletarComentario(comentario: Comentario) {
        await connection.query(`
            DELETE FROM Comentario
            WHERE id = $1;
        `, [comentario.id]);
    }

    static async editarComentario(comentario: Comentario) {
        await connection.query(`
            UPDATE Comentario
            SET conteudo = $1
            WHERE id = $2;
        `, [comentario.conteudo, comentario.id]);
    }
}