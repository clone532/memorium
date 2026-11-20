import bcrypt from "bcryptjs";
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
    termosVersaoAceita?: string | null;
    privacidadeVersaoLida?: string | null;

    constructor({ id, nome, email, senha, dataNasc, estaMorto, numero, tipoUsuario, imagem, termosVersaoAceita, privacidadeVersaoLida }: { id?: number, nome: string, email: string, senha: string,  dataNasc: Date, estaMorto: boolean, numero: string, tipoUsuario: TipoUsuario, imagem?: string, termosVersaoAceita?: string | null, privacidadeVersaoLida?: string | null }) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
        this.dataNasc = dataNasc;
        this.estaMorto = estaMorto;
        this.numero = numero;
        this.imagem = imagem;
        this.tipoUsuario = tipoUsuario;
        this.termosVersaoAceita = termosVersaoAceita;
        this.privacidadeVersaoLida = privacidadeVersaoLida;

    }

    static normalizarEmail(email: string) {
        return email.trim().toLowerCase();
    }
    
    static async cadastrarUsuario(usuario: Usuario) {
        const senhaHash = await bcrypt.hash(usuario.senha, 10);

        await connection.query(`
            INSERT INTO Usuario(
                nome, email, senha, dataNasc, numero, tipoUsuario, imagem,
                termos_versao_aceita, termos_aceito_em,
                privacidade_versao_lida, privacidade_lida_em
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                CASE WHEN $8::VARCHAR IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
                $9,
                CASE WHEN $9::VARCHAR IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END
            )
        `,
            [
                usuario.nome,
                Usuario.normalizarEmail(usuario.email),
                senhaHash,
                usuario.dataNasc,
                usuario.numero,
                usuario.tipoUsuario.id,
                usuario.imagem,
                usuario.termosVersaoAceita ?? null,
                usuario.privacidadeVersaoLida ?? null
            ]
        );
    }

    static async registrarAceiteDocumentos(id: number, termosVersao: string, privacidadeVersao: string) {
        const { rows } = await connection.query(`
            UPDATE Usuario
            SET termos_versao_aceita = $1,
                termos_aceito_em = CURRENT_TIMESTAMP,
                privacidade_versao_lida = $2,
                privacidade_lida_em = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id
        `, [termosVersao, privacidadeVersao, id]);

        if (rows.length !== 1) {
            throw new Error("Não foi possível registrar o aceite dos documentos para a conta.");
        }
    }

    static async buscarTodos() {
        const { rows } = await connection.query(`
            select usuario.id, usuario.nome, usuario.email,
            usuario.numero, usuario.dataNasc, usuario.estaMorto,
            tipo_usuario.id as id_tipo, tipo_usuario.nome as nome_tipo,
            tipo_usuario.descricao
            from usuario inner join tipo_usuario on usuario.tipoUsuario = tipo_usuario.id
        `);
        return rows.map((row) => new Usuario({
            id: row.id,
            nome: row.nome,
            email: row.email,
            senha: "",
            numero: row.numero,
            dataNasc: row.dataNasc,
            estaMorto: row.estaMorto,
            tipoUsuario: new TipoUsuario(row.id_tipo, row.nome_tipo, row.descricao)
        }));
    }

    static async atualizarUsuario(usuario: Usuario) {
        const senhaFinal = usuario.senha && usuario.senha.startsWith("$2") ? usuario.senha : await bcrypt.hash(usuario.senha, 10);

        await connection.query(`UPDATE Usuario SET nome=$1, email=$2, senha=$3, imagem=$4 WHERE id=$5;`,
            [
                usuario.nome,
                Usuario.normalizarEmail(usuario.email),
                senhaFinal,
                usuario.imagem,
                usuario.id
            ]
        );
    }

    static async atualizarSenha(id: number, senha: string) {
        const senhaHash = await bcrypt.hash(senha, 10);
        const resultado = await connection.query(
            `UPDATE Usuario SET senha=$1 WHERE id=$2`,
            [senhaHash, id]
        );
        if (resultado.rowCount !== 1) {
            throw new Error("Não foi possível atualizar a senha da conta.");
        }
    }

    static async atualizarComTipo(usuario: Usuario) {
        const senhaFinal = usuario.senha && usuario.senha.startsWith("$2") ? usuario.senha : await bcrypt.hash(usuario.senha, 10);

        await connection.query(`UPDATE Usuario SET nome=$1, email=$2, senha=$3, tipoUsuario=$4, imagem=$5 WHERE id=$6;`,
            [
                usuario.nome,
                Usuario.normalizarEmail(usuario.email),
                senhaFinal,
                usuario.tipoUsuario.id,
                usuario.imagem,
                usuario.id
            ]
        );
    }

    static async promoverParaGuardiao(idUsuario: number, idTipoGuardiao: number, nome: string, numero: string, email: string) {
        const result = await connection.query(
            `UPDATE Usuario
             SET tipoUsuario = $1,
                 nome = $2,
                 numero = $3
             WHERE id = $4
               AND LOWER(BTRIM(email)) = LOWER(BTRIM($5))
             RETURNING id`,
            [idTipoGuardiao, nome, numero, idUsuario, Usuario.normalizarEmail(email)]
        );
        return result.rowCount === 1;
    }

    static async deletarPorId(id: string) {
        await connection.query(`DELETE FROM Usuario WHERE id=$1`, [id]);
    }

    static async buscarPorId(id: string) {
        const { rows } = await connection.query(
            `SELECT u.id, u.nome, u.email, u.senha, u.numero, u.dataNasc, u.estaMorto, u.imagem,
            t.id AS id_tipo, t.nome AS nome_tipo, t.descricao
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
            tipoUsuario: new TipoUsuario(rows[0].id_tipo, rows[0].nome_tipo, rows[0].descricao),
            imagem: rows[0].imagem
        });
    }

    static async buscarPorEmail(email: string, ignorarUsuarioId?: number) {
        const { rows } = await connection.query(
            `SELECT
            u.id, u.nome, u.email, u.senha, u.numero, u.imagem,
            u.dataNasc, u.estaMorto,
            t.id as id_tipo, t.nome as nome_tipo, t.descricao
            FROM Usuario u
            JOIN tipo_usuario t ON u.tipoUsuario = t.id
            WHERE LOWER(BTRIM(u.email))=$1
              AND ($2::INTEGER IS NULL OR u.id <> $2)
            ORDER BY u.id
            LIMIT 1`,
            [Usuario.normalizarEmail(email), ignorarUsuarioId ?? null]
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
            tipoUsuario: new TipoUsuario(rows[0].id_tipo, rows[0].nome_tipo, rows[0].descricao),
            imagem: rows[0].imagem
        });
    }

    static async buscarPorEmailESenha(email: string, senha: string) {
        const { rows } = await connection.query(
            `SELECT u.id, u.nome, u.email, u.senha, u.numero, u.imagem,
            u.dataNasc, u.estaMorto, u.termos_versao_aceita, u.privacidade_versao_lida,
            t.id as id_tipo, t.nome as nome_tipo, t.descricao
            FROM Usuario u
            JOIN tipo_usuario t ON u.tipoUsuario = t.id
            WHERE LOWER(BTRIM(u.email))=$1
            ORDER BY u.id
            `,
            [Usuario.normalizarEmail(email)]
        );

        if (rows.length === 0) {
            return null;
        }

        const usuariosComSenhaValida: typeof rows = [];
        for (const row of rows) {
            if (await bcrypt.compare(senha, row.senha)) {
                usuariosComSenhaValida.push(row);
            }
        }

        if (usuariosComSenhaValida.length !== 1) {
            return null;
        }

        const usuarioAutenticado = usuariosComSenhaValida[0];
        return new Usuario({
            id: usuarioAutenticado.id,
            nome: usuarioAutenticado.nome,
            email: usuarioAutenticado.email,
            senha: usuarioAutenticado.senha,
            numero: usuarioAutenticado.numero,
            dataNasc: usuarioAutenticado.dataNasc,
            estaMorto: usuarioAutenticado.estaMorto,
            tipoUsuario: new TipoUsuario(usuarioAutenticado.id_tipo, usuarioAutenticado.nome_tipo, usuarioAutenticado.descricao),
            imagem: usuarioAutenticado.imagem,
            termosVersaoAceita: usuarioAutenticado.termos_versao_aceita,
            privacidadeVersaoLida: usuarioAutenticado.privacidade_versao_lida
        });
    }
}
