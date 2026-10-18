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

        const comentario = new Comentario({
            dataHora: new Date(),
            conteudo,
            comentador: (req.session as any).usuario,
            dono_perfil: (req.session as any).usuario
        });

        await Comentario.criarComentario(comentario);

        res.render('pages/perfilUsuario/comentarios', {
            mensagem: null
        });
    }
}