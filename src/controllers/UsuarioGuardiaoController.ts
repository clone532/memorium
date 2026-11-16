import { Request, Response } from "express";
import { UsuarioGuardiao } from "../models/UsuarioGuardiao";

export class UsuarioGuardiaoController {
    static async carregarGerenciar(req: Request, res: Response) {
        res.render('pages/guardiao/gerenciar', {
            mensagem: null,
            titulo: null
        });
    }

    static async carregarCriarConexao(req: Request, res: Response) {
        res.render('pages/guardiao/conexao', {
            mensagem: null,
            titulo: null
        });
    }

    static async conectar(req: Request, res: Response) {
        const idUsuario = Number(req.body.idUsuario);
        const idGuardiao = Number(req.body.idGuardiao);
        const chave = typeof req.body.chave === "string" ? req.body.chave : "";

        if (
            !Number.isSafeInteger(idUsuario)
            || idUsuario <= 0
            || !Number.isSafeInteger(idGuardiao)
            || idGuardiao <= 0
            || !chave.trim()
        ) {
            return res.status(400).render('pages/guardiao/conexao', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha corretamente os dados!',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const usuarioGuardiao = new UsuarioGuardiao({
            idUsuario,
            idGuardiao,
            chave,
            votoConfirma: false
        });

        if (await UsuarioGuardiao.buscar(idUsuario, idGuardiao)) {
            return res.status(409).render('pages/guardiao/conexao', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Este guardião já está vinculado a este usuário.',
                    titulo: 'Vínculo já existe'
                }
            });
        }

        try {
            await UsuarioGuardiao.criarConexao(usuarioGuardiao);
        } catch (error) {
            if (
                error && typeof error === "object"
                && "code" in error && error.code === "23505"
            ) {
                return res.status(409).render('pages/guardiao/conexao', {
                    mensagem: {
                        tipo: 'error',
                        valor: 'Este guardião já está vinculado a este usuário.',
                        titulo: 'Vínculo já existe'
                    }
                });
            }

            if (
                error && typeof error === "object"
                && "code" in error && error.code === "23503"
            ) {
                return res.status(400).render('pages/guardiao/conexao', {
                    mensagem: {
                        tipo: 'error',
                        valor: 'O usuário ou guardião informado não existe.',
                        titulo: 'Vínculo inválido'
                    }
                });
            }

            throw error;
        }

        return res.render('pages/guardiao/listar', {
            mensagem: {
                tipo: 'success',
                valor: 'Conexão criada com sucesso!',
                titulo: 'Sucesso'
            }
        });
    }

    static async desconectar(req: Request, res: Response) {
        const id = Number(req.body.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).send("Identificador de vínculo inválido.");
        }

        await UsuarioGuardiao.cancelarConexao(id);
        res.redirect('/guardiao/listar');
    }

    
}