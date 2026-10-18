import { connection } from "../infra/Connection";
import { Usuario } from "./Usuario";

export class Mural {
    id?: number;
    dataHora: Date;
    conteudo: string;
    comentador: Usuario;
    dono_perfil: Usuario;

    constructor({ id, dataHora, conteudo, comentador, dono_perfil }: { id?: number, dataHora: Date, conteudo: string, comentador: Usuario, dono_perfil: Usuario }) {
        this.id = id;
        this.dataHora = dataHora;
        this.conteudo = conteudo;
        this.comentador = comentador;
        this.dono_perfil = dono_perfil;
    }

    static async comentarMural(mural: Mural) {
        await connection.query(`
            INSERT INTO Mural(dataHora, conteudo, comentador, dono_perfil)
            VALUES ($1, $2, $3, $4);
            `,
        [
            mural.dataHora,
            mural.conteudo,
            mural.comentador.id,
            mural.dono_perfil.id
        ]
    );
    }

    static async deletarComentar(mural: Mural) {
        await connection.query(`
            DELETE FROM Mural
            WHERE id = $1;
        `, [mural.id]);
    }

    static async editarComentar(mural: Mural) {
        await connection.query(`
            UPDATE Mural
            SET conteudo = $1
            WHERE id = $2;
        `, [mural.conteudo, mural.id]);
    }
}