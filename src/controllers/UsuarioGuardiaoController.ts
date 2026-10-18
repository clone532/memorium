import { Request, Response } from "express";
import { UsuarioGuardiao } from "../models/UsuarioGuardiao";
import { Usuario } from "../models/Usuario";
import { Guardiao } from "../models/Guardiao";

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
        const { idUsuario, idGuardiao, chave } = req.body;

        if (!idUsuario || !idGuardiao || !chave) {
            return res.render('', {
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

        await UsuarioGuardiao.criarConexao(usuarioGuardiao); 

        res.render('pages/guardiao/listar', {
            mensagem: {
                tipo: 'success',
                valor: 'Conexão criada com sucesso!',
                titulo: 'Sucesso'
            }
        });
    }

    static async desconectar(req: Request, res: Response) {
        const { id } = req.body;
        await UsuarioGuardiao.cancelarConexao(id);
        res.redirect('/guardiao/listar');
    }

    
}