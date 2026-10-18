import { Request, Response } from "express";
import { Assinatura } from "../models/Assinatura";
import { Plano } from "../models/Plano";


export class AssinaturaController {

    static async carregarCadastrarAssinatura(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const planos = await Plano.listarPlanos();
        res.render('pages/assinatura/cadastrarAssinatura', {
            mensagem: null,
            usuario,
            planos
        });
    }

    static async carregarAssinatura(req: Request, res: Response) {
        const { usuario } = req.session as any;
        res.render('pages/assinatura/assinatura', {
            mensagem: null,
            usuario
        });
    }

    //crud, validações

    static async cadastrarAssinatura(req: Request, res: Response) {
        const { dias, plano: planoId } = req.body;
        const planos = await Plano.listarPlanos();

        if (!dias) {
            const { usuario } = req.session as any;
            return res.render('pages/assinatura/cadastrarAssinatura', {
                mensagem: {
                    tipo: 'error',
                    valor: 'O campo "dias" é obrigatório.',
                    titulo: 'Dados inválidos'
                },
                usuario,
                planos
            });
        }

        const assinaturaEncontrada = await Assinatura.buscarAssinaturaPorDias(dias);

        if (assinaturaEncontrada) {
            const { usuario } = req.session as any;
            return res.render('pages/assinatura/cadastrarAssinatura', {
                mensagem: {
                    tipo: 'error',
                    valor: `A assinatura de ${dias} já está cadastrada.`,
                    titulo: 'Assinatura existente'
                },
                usuario,
                planos
            });
        }

        const dataInicio = new Date();
        const assinatura: Assinatura = new Assinatura({
            dataInicio,
            dataFim: await Assinatura.calcularDataFim(dataInicio, parseInt(dias)),
            dias: parseInt(dias)
        });

        if (planoId) {
            const planoSelecionado = await Plano.buscarPlanoPorId(planoId);
            if (planoSelecionado) {
                assinatura.fkPlano = planoSelecionado as any;
            }
        }

        const sessUsuario = (req.session as any).usuario;
        if (sessUsuario && sessUsuario.id) {
            assinatura.fkUsuario = sessUsuario as any;
        }

        await Assinatura.cadastrarAssinatura(assinatura);

        const { usuario } = req.session as any;
        res.render('pages/assinatura/cadastrarAssinatura', {
            mensagem: {
                tipo: 'success',
                valor: `Assinatura de ${dias} dias cadastrada com sucesso!`,
                titulo: 'Sucesso'
            },
            usuario,
            planos
        });
    }
}