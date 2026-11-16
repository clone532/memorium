import { Request, Response } from "express";
import { Comentario } from "../models/Comentario";

export class ComentarioController {
    
    static async carregarComentarios(req: Request, res: Response) {
        
        res.render('pages/perfilUsuario/comentarios', {
            mensagem: null,
        });
    }

    static async criarComentario(req: Request, res: Response) {
        const { conteudo } = req.body;

        if (!conteudo) {
            return res.render('pages/perfilUsuario/comentarios', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Não é possível criar um comentário vazio',
                    titulo: 'Erro ao criar comentário'
                }
            });
        }

        const usuarioSessao = (req.session as any).usuario;

        const comentario = new Comentario({
            dataHora: new Date(),
            conteudo,
            fkMural: { id: 1 } as any,
            fkUsuario: { id: usuarioSessao?.id } as any
        });

        await Comentario.criarComentario(comentario);

        res.render('pages/perfilUsuario/comentarios', {
            mensagem: null
        });
    }
}