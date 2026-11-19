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
            `SELECT * FROM guardiao
             WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))
               AND BTRIM(numero) = BTRIM($2)`,
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

    static async listarTodosParaAdministrador() {
        const { rows } = await connection.query(`
            WITH guardioes AS (
                SELECT
                    g.id,
                    u.id AS id_usuario,
                    g.nome,
                    g.email,
                    g.numero,
                    EXISTS (
                        SELECT 1
                        FROM usuario_guardiao ug
                        WHERE ug.idguardiao = g.id
                          AND ug.estado_vinculo = 'confirmado'
                    ) AS tem_vinculo,
                    1 AS prioridade_origem
                FROM guardiao g
                LEFT JOIN usuario u ON LOWER(BTRIM(u.email)) = LOWER(BTRIM(g.email))

                UNION ALL

                SELECT
                    u.id,
                    u.id AS id_usuario,
                    u.nome,
                    u.email,
                    COALESCE(u.numero, '') AS numero,
                    EXISTS (
                        SELECT 1
                        FROM usuario_guardiao ug
                        JOIN guardiao g ON g.id = ug.idguardiao
                        WHERE LOWER(BTRIM(g.email)) = LOWER(BTRIM(u.email))
                          AND ug.estado_vinculo = 'confirmado'
                    ) AS tem_vinculo,
                    2 AS prioridade_origem
                FROM usuario u
                JOIN tipo_usuario t ON t.id = u.tipoUsuario
                WHERE t.nome = 'GUARDIAO'
            ),
            guardioes_unicos AS (
                SELECT DISTINCT ON (LOWER(BTRIM(email)))
                    id_usuario,
                    nome,
                    email,
                    numero
                FROM guardioes
                ORDER BY
                    LOWER(BTRIM(email)),
                    tem_vinculo DESC,
                    (id_usuario IS NOT NULL) DESC,
                    prioridade_origem DESC,
                    (NULLIF(BTRIM(numero), '') IS NOT NULL) DESC,
                    id DESC
            )
            SELECT id_usuario, nome, email, numero
            FROM guardioes_unicos
            ORDER BY LOWER(BTRIM(nome)), email
        `);

        return rows;
    }

    static async buscarApenasNaSessao(guardiao: Guardiao, usuarioGuardiao: UsuarioGuardiao) {
        const { rows } = await connection.query(`SELECT
            usuario_guardiao.id, usuario_guardiao.chave, guardiao.nome, guardiao.email, guardiao.numero
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
                numero: row.numero
            }));
    }

}