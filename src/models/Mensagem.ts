import { connection } from "../infra/Connection";
import { TipoMensagem } from "./TipoMensagem";

export class Mensagem {
    id?: number;
    titulo: string;
    anexoUrl: string;
    idTipoMensagem: TipoMensagem;

    constructor({ id, titulo, anexoUrl, idTipoMensagem }: { id?: number, titulo:string, anexoUrl: string, idTipoMensagem: TipoMensagem }) {
        this.id = id;
        this.titulo = titulo;
        this.anexoUrl = anexoUrl;
        this.idTipoMensagem= idTipoMensagem;
    }

    static async guardarMensagem(mensagem: Mensagem) {
        await connection.query(`INSERT INTO mensagem(titulo, anexoUrl, idTipoMensagem) VALUES ($1, $2, $3);`,
            [
                mensagem.titulo,
                mensagem.anexoUrl,
                mensagem.idTipoMensagem
            ]
        );
    }

    static async deletarMensagem(mensagem: Mensagem) {
        await connection.query(`DELETE FROM mensagem WHERE id = $1;`, [mensagem.id]);
    }

    static async buscar(mensagem: Mensagem) {
        await connection.query(`
            SELECT mensagem.titulo, mensagem.anexoUrl, TipoMensagem.nomeTipo as tipo
            FROM mensagem INNER JOIN TipoMensagem on mensagem.idTipoMensagem = TipoMensagem.id
            WHERE mensagem.titulo = $1;
            `, [mensagem.titulo]);
    }

    static async listar(mensagem: Mensagem) {
        await connection.query(`
            SELECT mensagem.titulo, mensagem.anexoUrl, TipoMensagem.nomeTipo as tipo
            FROM mensagem INNER JOIN TipoMensagem on mensagem.idTipoMensagem = TipoMensagem.id
            `);
    }

    static async editar(mensagem: Mensagem) {
        await connection.query(`UPDATE mensagem
            SET titulo=$1, anexoUrl=$2, idTipoMensagem=$3
            WHERE id=$4;
            `,
            [
                mensagem.titulo,
                mensagem.anexoUrl,
                mensagem.idTipoMensagem,
                mensagem.id
            ]
        );
    }
}