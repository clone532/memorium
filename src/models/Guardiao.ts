import { connection } from "../infra/Connection";
import { UsuarioGuardiao } from "./UsuarioGuardiao";

export class Guardiao {
    id?: number;
    nome: string;
    email: string;
    numero: string;

    constructor({ id, nome, email, numero }: { id?: number, nome: string, email: string, numero: string }) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.numero = numero;
    }

// CRUD COMEÇA AQUI

    static async cadastrarGuardiao(guardiao: Guardiao) {
    await connection.query(`INSERT INTO guardiao(nome, email, numero) VALUES ($1, $2, $3);`,
            [
                guardiao.nome,
                guardiao.email,
                guardiao.numero
            ]
        );
    }

    static async buscarTodosGuardiao() {
        const { rows } = await connection.query(`SELECT * FROM guardiao;`);
        return rows.map((row) => new Guardiao({
            id: row.id,
            nome: row.nome,
            email: row.email,
            numero: row.numero
        }));
    }

    static async atualizarGuardiao(guardiao: Guardiao) {
        await connection.query(`UPDATE guardiao SET nome=$1, email=$2, numero=$3 WHERE id=$4;`,
            [
                guardiao.nome,
                guardiao.email,
                guardiao.numero,
                guardiao.id
            ]
        );
    }

    static async deletarPorIdGuardiao(id: string) {
        await connection.query(`DELETE FROM guardiao WHERE id=$1`, [id]);
    }

    static async buscarPorIdGuardiao(id: string) {
        const { rows } = await connection.query(
            `SELECT * FROM guardiao WHERE id=$1`,
            [id]
        );

        if (!rows[0]) {
            return null;
        }

        return new Guardiao({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarPorEmailENumero(email: string, numero: string) {
        const { rows } = await connection.query(
            `SELECT * FROM guardiao WHERE email=$1 AND numero=$2`,
            [email, numero]
        );
        if (!rows[0]) {
            return null;
        }

        return new Guardiao({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarTodos() {
        const { rows } = await connection.query(`SELECT * FROM guardiao;`);
        return rows.map((row) => new Guardiao({
            id: row.id,
            nome: row.nome,
            email: row.email,
            numero: row.numero
        })); 
    }

    static async buscarApenasNaSessao(guardiao: Guardiao, usuarioGuardiao: UsuarioGuardiao) {
        const { rows } = await connection.query(`SELECT
            usuario_guardiao.id, usuario_guardiao.chave, guardiao.nome
            FROM usuario_guardiao
            JOIN guardiao ON usuario_guardiao.idGuardiao = guardiao.id
            WHERE usuario_guardiao.idUsuario = $1
            `, [usuarioGuardiao.idUsuario]);
            if (!rows[0]) {
                return null;
            }
            return rows.map((row) => new Guardiao({
                id: row.id,
                nome: row.nome,
                email: row.email,
                numero: row.numero,
                usuarioGuardiao: new UsuarioGuardiao(rows[0].chave) /*
                meu ojetivo aqui é poder incluir a chave do Guardião na lista, mas a
                chave pertence a uma tabela diferente.
                */
            }));
    }

}