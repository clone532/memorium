import { connection } from "../infra/Connection";

export class Destinatario {
    id?: number;
    fkUsuario?: number;
    nome: string;
    email: string;
    numero: string = '';

    constructor({ id, fkUsuario, nome, email, numero}: {id?: number, fkUsuario?: number, nome: string, email: string, numero: string}) {
        this.id = id;
        this.fkUsuario = fkUsuario;
        this.nome = nome;
        this.email = email;
        this.numero = numero;
    }

    //CRUD

    static async cadastrarDestinatario(destinatario: Destinatario, fkUsuario: number) {
        await connection.query(`INSERT INTO Destinatario(nome, email, numero, fkUsuario) VALUES ($1, $2, $3, $4)`, 
            [
                destinatario.nome,
                destinatario.email,
                destinatario.numero,
                fkUsuario
            ]
        );
    }

    static async buscarPorNumero(numero: string, fkUsuario: number) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE numero = $1 AND fkUsuario = $2`, [numero, fkUsuario]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            fkUsuario: rows[0].fkusuario,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarPorEmail(email: string, fkUsuario: number) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE email = $1 AND fkUsuario = $2`, [email, fkUsuario]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            fkUsuario: rows[0].fkusuario,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarPorNome(nome: string, fkUsuario: number) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE nome = $1 AND fkUsuario = $2`, [nome, fkUsuario]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            fkUsuario: rows[0].fkusuario,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }
    static async buscarPorId(id: string, fkUsuario: number) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE id = $1 AND fkUsuario = $2`, [id, fkUsuario]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            fkUsuario: rows[0].fkusuario,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarTodos(fkUsuario: number) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE fkUsuario = $1`, [fkUsuario]);

        return rows.map((row) => new Destinatario({
            id: row.id,
            fkUsuario: row.fkusuario,
            nome: row.nome,
            email: row.email,
            numero: row.numero
        }));
    }

    static async deletarDestinatario(id: string, fkUsuario: number) {
        const result = await connection.query(`DELETE FROM Destinatario WHERE id = $1 AND fkUsuario = $2`, [id, fkUsuario]);
        return result.rowCount === 1;
    }

    static async atualizarDestinatario(destinatario: Destinatario, fkUsuario: number) {
        const result = await connection.query(`UPDATE Destinatario SET nome=$1, email=$2, numero=$3 WHERE id=$4 AND fkUsuario=$5;`,
            [
                destinatario.nome,
                destinatario.email,
                destinatario.numero,
                destinatario.id,
                fkUsuario
            ]
        );
        return result.rowCount === 1;
    }
}