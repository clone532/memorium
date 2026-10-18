import { connection } from "../infra/Connection";
import { TipoUsuario } from "./TipoUsuario";

export class Usuario {
    id?: number;
    nome: string;
    email: string;
    senha: string;
    dataNasc: Date;
    estaMorto: boolean = false;
    numero: string = '';
    imagem?: string;
    tipoUsuario: TipoUsuario;

    constructor({ id, nome, email, senha, dataNasc, estaMorto, numero, tipoUsuario, imagem }: { id?: number, nome: string, email: string, senha: string,  dataNasc: Date, estaMorto: boolean, numero: string, tipoUsuario: TipoUsuario, imagem?: string }) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
        this.dataNasc = dataNasc;
        this.estaMorto = estaMorto;
        this.numero = numero;
        this.imagem = imagem;
        this.tipoUsuario = tipoUsuario;

    }
    
    static async cadastrarUsuario(usuario: Usuario) {
        await connection.query(`INSERT INTO Usuario(nome, email, senha, dataNasc, tipoUsuario, imagem) VALUES ($1, $2, $3, $4, $5, $6);`,
            [
                usuario.nome,
                usuario.email,
                usuario.senha,
                usuario.dataNasc,
                usuario.tipoUsuario.id,
                usuario.imagem
            ]
        );
    }

    static async buscarTodos() {
        const { rows } = await connection.query(`
            select usuario.id, usuario.nome, usuario.email, usuario.senha,
            usuario.numero, usuario.dataNasc, usuario.estaMorto, usuario.imagem,
            tipo_usuario.id as id_tipo, tipo_usuario.nome as nome_tipo,
            tipo_usuario.descricao
            from usuario inner join tipo_usuario on usuario.tipoUsuario = tipo_usuario.id
        `);
        return rows.map((row) => new Usuario({
            id: row.id,
            nome: row.nome,
            email: row.email,
            senha: row.senha,
            numero: row.numero,
            dataNasc: row.dataNasc,
            estaMorto: row.estaMorto,
            imagem: row.imagem,
            tipoUsuario: new TipoUsuario(row.id_tipo, row.nome_tipo, row.descricao)
        }));
    }

    static async atualizarUsuario(usuario: Usuario) {
        await connection.query(`UPDATE Usuario SET nome=$1, email=$2, senha=$3, tipoUsuario=$4, imagem=$5 WHERE id=$6;`,
            [
                usuario.nome,
                usuario.email,
                usuario.senha,
                usuario.imagem,
                usuario.tipoUsuario.id,
                usuario.id
            ]
        );
    }

    static async deletarPorId(id: string) {
        await connection.query(`DELETE FROM Usuario WHERE id=$1`, [id]);
    }

    static async buscarPorId(id: string) {
        const { rows } = await connection.query(
            `SELECT u.*, t.id AS id_tipo, t.nome AS nome_tipo, t.descricao
            FROM Usuario u
            JOIN tipo_usuario t ON u.tipoUsuario = t.id
            WHERE u.id=$1`,
            [id]
        );

        if (!rows[0]) {
            return null;
        }

        return new Usuario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            senha: rows[0].senha,
            numero: rows[0].numero,
            dataNasc: rows[0].dataNasc,
            estaMorto: rows[0].estaMorto,
            tipoUsuario: new TipoUsuario(rows[0].id_tipo, rows[0].nome_tipo, rows[0].descricao)
        });
    }

    static async buscarPorEmail(email: string) {
        const { rows } = await connection.query(
            `SELECT
            u.id, u.nome, u.email, u.senha, u.numero,
            u.dataNasc, u.estaMorto as status_vida,
            t.id as id_tipo, t.nome as nome_tipo, t.descricao
            FROM Usuario u
            JOIN tipo_usuario t ON u.tipoUsuario = t.id
            WHERE u.email=$1`,
            [email]
        );
        if (!rows[0]) {
            return null;
        }

        return new Usuario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            senha: rows[0].senha,
            numero: rows[0].numero,
            dataNasc: rows[0].dataNasc,
            estaMorto: rows[0].estaMorto,
            tipoUsuario: new TipoUsuario(rows[0].id_tipo, rows[0].nome_tipo, rows[0].descricao)
        });
    }

    static async buscarPorEmailESenha(email: string, senha: string) {
        const { rows } = await connection.query(
            `SELECT u.id, u.nome, u.email, u.senha, u.numero,
            u.dataNasc, u.estaMorto as status_vida,
            t.id as id_tipo, t.nome as nome_tipo, t.descricao
            FROM Usuario u
            JOIN tipo_usuario t ON u.tipoUsuario = t.id
            WHERE u.email=$1 AND u.senha=$2`,
            [email, senha]
        );
        if (!rows[0]) {
            return null;
        }

        return new Usuario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            senha: rows[0].senha,
            numero: rows[0].numero,
            dataNasc: rows[0].dataNasc,
            estaMorto: rows[0].estaMorto,
            tipoUsuario: new TipoUsuario(rows[0].id_tipo, rows[0].nome_tipo, rows[0].descricao)
        });
    }
}
