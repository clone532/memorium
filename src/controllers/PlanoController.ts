import { Request, Response } from "express";
import { Plano } from "../models/Plano";
import { Assinatura } from "../models/Assinatura";

export class PlanoController {

    /* ASSINAR PLANO */
    static async carregarPlanos(req: Request, res: Response) {
        const planos = await Plano.listarPlanos();

        res.render('pages/plano/planos', {
            mensagem: null,
            planos
        });
    }

    static async assinar(req: Request, res: Response) {
        const { id } = req.params;
        const { nomePlano } = req.body;
        const { usuario } = req.session as any;

        let nomePlanoAssinado = nomePlano;

        if (!nomePlanoAssinado && id) {
            const planoSelecionado = await Plano.buscarPlanoPorId(id);
            nomePlanoAssinado = planoSelecionado ? planoSelecionado.nomePlano : 'Plano';
        }

        await Plano.assinarPlano;
        await Assinatura.calcularDataFim(new Date(req.body.dataInicio), Number(req.body.dias));

        const planos = await Plano.listarPlanos();

        res.render('pages/plano/planos', {
            mensagem: {
                tipo: 'success',
                valor: `Você assinou o plano ${nomePlanoAssinado}.`,
                titulo: 'Parabéns'
            },
            planos
        });
    }

    static async cancelar(req: Request, res: Response) {
        const { nomePlano } = req.body;

        await Plano.cancelarAssinatura;

        const planos = await Plano.listarPlanos();

        res.render('pages/plano/planos', {
            mensagem: {
                tipo: 'success',
                valor: `Plano ${nomePlano} cancelado com sucesso.`,
                titulo: null
            },
            planos
        });
    }

    static async carregarGerenciarPlanos(req: Request, res: Response) {
        const { plano } = req.session as any;

        const planos = await Plano.listarPlanos();

        return res.render('pages/plano/cadastrarListarPlanos', {
            plano,
            planos,
            planoEditar: null,
            mensagem: null,
        });
    }

    static async carregarGerenciarPlanosComEdicao(req: Request, res: Response) {
        const { id } = req.params;
        const { plano } = req.session as any;

        const planoEncontrado = await Plano.buscarPlanoPorId(id);

        if (!planoEncontrado) {
            return res.redirect('/plano/cadastrarListarPlanos');
        }

        const planos = await Plano.listarPlanos();

        return res.render('pages/plano/cadastrarListarPlanos', {
            plano,
            planos,
            planoEditar: planoEncontrado,
            mensagem: null,
        });
    }

    /* CRIAÇÃO DE PLANOS */

    static async cadastrarPlano(req: Request, res: Response) {
        const { nomePlano, valorMensal, armazenamentoGB } = req.body;
        const { plano } = req.session as any;

        if (!nomePlano || !valorMensal || !armazenamentoGB) {
            const planos = await Plano.listarPlanos();
            return res.render('pages/plano/cadastrarListarPlanos', {
                plano,
                planos,
                planoEditar: null,
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha corretamente os dados!',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const valorFormatado = parseFloat(String(valorMensal).replace(',', '.'));
        const armazenamentoNumerico = Number(armazenamentoGB);

        if (Number.isNaN(valorFormatado) || Number.isNaN(armazenamentoNumerico)) {
            const planos = await Plano.listarPlanos();
            return res.render('pages/plano/cadastrarListarPlanos', {
                plano,
                planos,
                planoEditar: null,
                mensagem: {
                    tipo: 'error',
                    valor: 'Informe valores numéricos válidos para preço e armazenamento.',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const novoPlano: Plano = new Plano({
            nomePlano,
            valorMensal: valorFormatado.toFixed(2),
            armazenamentoGB: armazenamentoNumerico
        });

        await Plano.criarPlano(novoPlano);

        const planos = await Plano.listarPlanos();

        return res.render('pages/plano/cadastrarListarPlanos', {
            plano,
            planos,
            planoEditar: null,
            mensagem: {
                tipo: 'success',
                valor: 'Novo plano cadastrado',
                titulo: 'Sucesso'
            }
        });
    }

    static async excluirPlanos(req: Request, res: Response) {
        const { id } = req.params;
        const { plano } = req.session as any;

        const planoExcluido = await Plano.deletarPlano(id);
        const planoAindaExiste = planoExcluido ? null : await Plano.buscarPlanoPorId(id);

        const planos = await Plano.listarPlanos();

        return res.render('pages/plano/cadastrarListarPlanos', {
            plano,
            planos,
            planoEditar: null,
            mensagem: {
                tipo: planoExcluido ? 'success' : 'error',
                valor: planoExcluido
                    ? 'Plano excluído com sucesso'
                    : planoAindaExiste
                        ? 'Não é possível excluir este plano porque existem assinaturas vinculadas.'
                        : 'Este plano não existe ou já foi excluído.',
                titulo: 'Sucesso'
            }
        });
    }

    static async editarPlano(req: Request, res: Response) {
        const { id } = req.params;
        const { nomePlano, valorMensal, armazenamentoGB } = req.body;
        const { plano } = req.session as any;

        const planoEncontrado = await Plano.buscarPlanoPorId(id);

        if (!planoEncontrado) {
            return res.redirect('/plano/cadastrarListarPlanos');
        }

        const valorFormatado = parseFloat(String(valorMensal).replace(',', '.'));
        const armazenamentoNumerico = Number(armazenamentoGB);

        if (Number.isNaN(valorFormatado) || Number.isNaN(armazenamentoNumerico)) {
            const planos = await Plano.listarPlanos();
            return res.render('pages/plano/cadastrarListarPlanos', {
                plano,
                planos,
                planoEditar: planoEncontrado,
                mensagem: {
                    tipo: 'error',
                    valor: 'Informe valores numéricos válidos para preço e armazenamento.',
                    titulo: 'Dados inválidos'
                }
            });
        }

        planoEncontrado.nomePlano = nomePlano;
        planoEncontrado.valorMensal = valorFormatado.toFixed(2);
        planoEncontrado.armazenamentoGB = armazenamentoNumerico;

        await Plano.updatePlano(planoEncontrado);

        const planos = await Plano.listarPlanos();

        return res.render('pages/plano/cadastrarListarPlanos', {
            plano,
            planos,
            planoEditar: null,
            mensagem: {
                tipo: 'success',
                valor: 'Dados salvos com sucesso!',
                titulo: 'Dados do plano'
            }
        });
    }
}