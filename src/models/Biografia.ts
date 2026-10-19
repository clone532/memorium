import { connection } from "../infra/Connection";
import { Mensagem } from "./Mensagem";
import { Usuario } from "./Usuario";

export class Biografia {
    id?: number;
    anexoUrl: string;
    fkUsuario?: Usuario;
    fkMensagem?: Mensagem;

    constructor({id, anexoUrl, fkUsuario, fkMensagem}: {id?: number, anexoUrl: string, fkUsuario?: Usuario, fkMensagem?: Mensagem}) {
        this.id = id;
        this.anexoUrl = anexoUrl;
        this.fkUsuario = fkUsuario;
        this.fkMensagem = fkMensagem;
    }

    static async criar(biografia: Biografia) {
        await connection.query(`INSERT INTO Biografia(anexoUrl, fkUsuario, fkMensagem) VALUES ($1, $2, $3);`,
            [
                biografia.anexoUrl,
                biografia.fkUsuario?.id,
                biografia.fkMensagem?.id
            ]
        );
    }

    static async atualizar(biografia: Biografia) {
        await connection.query(`UPDATE Biografia SET anexoUrl = $1 WHERE id = $2;`,
            [
                biografia.anexoUrl,
                biografia.id
            ]
        );
    }

    static async deletar(id: string) {
        await connection.query(`DELETE FROM Biografia WHERE id = $1;`, [id]);
    }

    static async buscarPorUsuario(idUsuario: string) {
        const { rows } = await connection.query(`
            SELECT Biografia.anexoUrl, Usuario.id
            FROM Biografia
            INNER JOIN Usuario usuario ON biografia.fkUsuario = usuario.id
            WHERE biografia.fkUsuario = $1;
        `, [idUsuario]);
        return rows;
    }
}