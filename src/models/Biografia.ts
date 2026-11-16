import { connection } from "../infra/Connection";

export class Biografia {
    id?: number;
    conteudo: string;
    anexoUrl: string | null;
    tipoAnexo: string | null;
    fkUsuario: number;

    constructor({
        id,
        conteudo,
        anexoUrl,
        tipoAnexo,
        fkUsuario
    }: {
        id?: number;
        conteudo: string;
        anexoUrl: string | null;
        tipoAnexo: string | null;
        fkUsuario: number;
    }) {
        this.id = id;
        this.conteudo = conteudo;
        this.anexoUrl = anexoUrl;
        this.tipoAnexo = tipoAnexo;
        this.fkUsuario = fkUsuario;
    }

    static async criar(biografia: Biografia) {
        await connection.query(
            `INSERT INTO Biografia(conteudo, anexoUrl, tipoAnexo, fkUsuario)
             VALUES ($1, $2, $3, $4)`,
            [
                biografia.conteudo,
                biografia.anexoUrl,
                biografia.tipoAnexo,
                biografia.fkUsuario
            ]
        );
    }

    static async buscarPorUsuario(idUsuario: number) {
        const { rows } = await connection.query(
            `SELECT id, conteudo, anexoUrl AS anexo_url,
                    tipoAnexo AS tipo_anexo, dataHora AS data_hora
             FROM Biografia
             WHERE fkUsuario = $1
             ORDER BY dataHora DESC, id DESC`,
            [idUsuario]
        );

        return rows;
    }
}
