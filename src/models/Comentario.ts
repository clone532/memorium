import { connection } from "../infra/Connection";

export class Comentario {
    id?: number;
    dataHora: Date;
    conteudo: string;
    fkMural: number;
    fkUsuario: number;

    constructor({ id, dataHora, conteudo, fkMural, fkUsuario }: { id?: number, dataHora: Date, conteudo: string, fkMural: number, fkUsuario: number }) {
        this.id = id;
        this.dataHora = dataHora;
        this.conteudo = conteudo;
        this.fkMural = fkMural;
        this.fkUsuario = fkUsuario;
    }

    static async criarComentario(comentario: Comentario) {
        await connection.query(
            `INSERT INTO Comentario(dataHora, conteudo, fkMural, fkUsuario)
             VALUES ($1, $2, $3, $4)`,
            [
                comentario.dataHora,
                comentario.conteudo,
                comentario.fkMural,
                comentario.fkUsuario
            ]
        );
    }

    static async buscarPorMural(fkMural: number) {
        const { rows } = await connection.query(
            `SELECT c.id, c.dataHora, c.conteudo, c.fkMural, c.fkUsuario,
                    u.nome AS autor_nome, u.imagem AS autor_imagem
             FROM Comentario c
             JOIN Usuario u ON u.id = c.fkUsuario
             WHERE c.fkMural = $1
             ORDER BY c.dataHora DESC, c.id DESC`,
            [fkMural]
        );

        return rows;
    }

    static async deletarComentario(id: number, fkUsuario: number) {
        await connection.query(
            `DELETE FROM Comentario WHERE id = $1 AND fkUsuario = $2`,
            [id, fkUsuario]
        );
    }

    static async editarComentario(id: number, fkUsuario: number, conteudo: string) {
        await connection.query(
            `UPDATE Comentario SET conteudo = $1 WHERE id = $2 AND fkUsuario = $3`,
            [conteudo, id, fkUsuario]
        );
    }
}