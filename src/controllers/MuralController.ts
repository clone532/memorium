import { Request, Response } from "express";
import { Mural } from "../models/Mural";

export class MuralController {

    static async carregarMural(req: Request, res: Response) {

        res.render('pages/perfilUsuario/telamural', {
            mensagem: null,
        });
    }

    static async criarMural(req: Request, res: Response) {
        const { conteudo } = req.body;

        if (!conteudo) {
            return res.render('pages/perfilUsuario/telamural', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Não é possível criar um comentário vazio',
                    titulo: 'Erro ao criar comentário'
                }
            });
        }

        const mural = new Mural({
            dataHora: new Date(),
            conteudo,
            comentador: (req.session as any).usuario,
            dono_perfil: (req.session as any).usuario
        });

        await Mural.comentarMural(mural);

        res.render('pages/perfilUsuario/telamural', {
            mensagem: null
        });
    }
}