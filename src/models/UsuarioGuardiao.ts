import { connection } from "../infra/Connection";
import { Guardiao } from "./Guardiao";
import { Usuario } from "./Usuario";

export class UsuarioGuardiao {
    id?: number;
    idUsuario?: Usuario;
    idGuardiao?: Guardiao;
    votoConfirma: boolean = false;
    chave: string;

    constructor({ id, idUsuario, idGuardiao, votoConfirma, chave }: { id?: number, idUsuario?: Usuario, idGuardiao?: Guardiao, votoConfirma: boolean, chave: string }) {
        this.id = id;
        this.idUsuario = idUsuario;
        this.idGuardiao = idGuardiao;
        this.votoConfirma = votoConfirma;
        this.chave = chave;
    }

    static async criarConexao(usuarioGuardiao: UsuarioGuardiao) {
        await connection.query(`INSERT INTO usuario_guardiao(idusuario, idguardiao, chave) VALUES ($1, $2, $3);`, 
            [
                usuarioGuardiao.idUsuario,
                usuarioGuardiao.idGuardiao,
                usuarioGuardiao.chave
            ]
        );
    }

    static async cancelarConexao(usuarioGuardiao: UsuarioGuardiao) {
        await connection.query(`DELETE FROM usuario_guardiao WHERE id = $1;`,
            [
                usuarioGuardiao.id
            ]
        );
    }

    static async buscar(usuarioGuardiao: UsuarioGuardiao) {
        await connection.query(`SELECT * FROM usuario_guardiao WHERE idGuardiao = $1 AND idUsuario = $2;`,
            [
                usuarioGuardiao.idGuardiao,
                usuarioGuardiao.idUsuario
            ]
        );
    }

}