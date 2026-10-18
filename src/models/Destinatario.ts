import { connection } from "../infra/Connection";

export class Destinatario {
    id?: number;
    nome: string;
    email: string;
    numero: string = '';

    constructor({ id, nome, email, numero}: {id?: number, nome: string, email: string, numero: string}) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.numero = numero;
    }

    //CRUD

    static async cadastrarDestinatario(destinatario: Destinatario) {
        await connection.query(`INSERT INTO Destinatario(nome, email, numero) VALUES ($1, $2, $3)`, 
            [
                destinatario.nome,
                destinatario.email,
                destinatario.numero
            ]
        );
    }

    static async buscarPorNumero(numero: string) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE numero = $1`, [numero]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarPorEmail(email: string) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE email = $1`, [email]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarPorNome(nome: string) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE nome = $1`, [nome]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }
    static async buscarPorId(id: string) {
        const { rows } = await connection.query(`SELECT * FROM Destinatario WHERE id = $1`, [id]);
        if (!rows[0]) {
            return null;
        }

        return new Destinatario({
            id: rows[0].id,
            nome: rows[0].nome,
            email: rows[0].email,
            numero: rows[0].numero
        });
    }

    static async buscarTodos() {
        const { rows } = await connection.query(`SELECT * FROM Destinatario`);

        return rows.map((row) => new Destinatario({
            id: row.id,
            nome: row.nome,
            email: row.email,
            numero: row.numero
        }));
    }

    static async deletarDestinatario(id: string) {
        await connection.query(`DELETE FROM Destinatario WHERE id = $1`, [id]);
    }

    static async atualizarDestinatario(destinatario: Destinatario) {
        await connection.query(`UPDATE Destinatario SET nome=$1, email=$2, numero=$3 WHERE id=$4;`,
            [
                destinatario.nome,
                destinatario.email,
                destinatario.numero,
                destinatario.id
            ]
        );
    }
}