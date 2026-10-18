import { Request, Response } from "express";
import { TipoMensagem } from "../models/TipoMensagem";

export class TipoMensagemController {
    static async carregarTipoMensagem(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const tiposMensagem = await TipoMensagem.listarTiposMensagem();
        res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
            mensagem: null,
            usuario,
            tiposMensagem,
            tipoMensagemParaEditar: null
        });
    }

    static async carregarEdicaoTipoMensagem(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const tipoMensagemParaEditar = await TipoMensagem.buscarTipoPorId(req.params.id);

        if (!tipoMensagemParaEditar) {
            return res.redirect('/tipoMensagem/cadastrarTipoMensagem');
        }

        const tiposMensagem = await TipoMensagem.listarTiposMensagem();
        return res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
            mensagem: null,
            usuario,
            tiposMensagem,
            tipoMensagemParaEditar
        });
    }

    static async cadastrarTipoMensagem(req: Request, res: Response) {
        const { nomeTipo } = req.body;
        const { usuario } = req.session as any;

        if (!nomeTipo) {
            const tiposMensagem = await TipoMensagem.listarTiposMensagem();
            return res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Informe o nome do tipo de mensagem.',
                    titulo: 'Dados inválidos'
                },
                usuario,
                tiposMensagem,
                tipoMensagemParaEditar: null
            });
        }

        const tipoMensagemExistente = await TipoMensagem.buscarTipoPorNome(nomeTipo);

        if (tipoMensagemExistente) {
            const tiposMensagem = await TipoMensagem.listarTiposMensagem();
            return res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
                mensagem: {
                    tipo: 'error',
                    valor: `O tipo de mensagem ${nomeTipo} já está cadastrado.`,
                    titulo: 'Tipo de mensagem existente'
                },
                usuario,
                tiposMensagem,
                tipoMensagemParaEditar: null
            });
        }

        const tipoMensagem: TipoMensagem = new TipoMensagem({
            nomeTipo
        });

        await TipoMensagem.cadastrarTipoMensagem(tipoMensagem);
        const tiposMensagem = await TipoMensagem.listarTiposMensagem();

        res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
            mensagem: {
                tipo: 'success',
                valor: `Tipo ${nomeTipo} cadastrado com sucesso!`,
                titulo: 'Cadastro realizado'
            },
            usuario,
            tiposMensagem,
            tipoMensagemParaEditar: null
        });

    }

    static async editarTipoMensagem(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const { id } = req.params;
        const nomeTipo = String(req.body.nomeTipo || '').trim();
        const tipoMensagemParaEditar = await TipoMensagem.buscarTipoPorId(id);

        if (!tipoMensagemParaEditar) {
            return res.redirect('/tipoMensagem/cadastrarTipoMensagem');
        }

        let mensagem = null;
        if (!nomeTipo) {
            mensagem = {
                tipo: 'error',
                valor: 'Informe o nome do tipo de mensagem.',
                titulo: 'Dados inválidos'
            };
        } else {
            const existente = await TipoMensagem.buscarTipoPorNome(nomeTipo);
            if (existente && existente.id !== tipoMensagemParaEditar.id) {
                mensagem = {
                    tipo: 'error',
                    valor: `O tipo de mensagem ${nomeTipo} já está cadastrado.`,
                    titulo: 'Tipo de mensagem existente'
                };
            }
        }

        if (mensagem) {
            const tiposMensagem = await TipoMensagem.listarTiposMensagem();
            return res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
                mensagem,
                usuario,
                tiposMensagem,
                tipoMensagemParaEditar: { ...tipoMensagemParaEditar, nomeTipo }
            });
        }

        await TipoMensagem.editarTipoMensagem(new TipoMensagem({
            id: tipoMensagemParaEditar.id,
            nomeTipo
        }));

        const tiposMensagem = await TipoMensagem.listarTiposMensagem();
        return res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
            mensagem: {
                tipo: 'success',
                valor: `Tipo ${nomeTipo} atualizado com sucesso!`,
                titulo: 'Atualização realizada'
            },
            usuario,
            tiposMensagem,
            tipoMensagemParaEditar: null
        });
    }

    static async excluirTipoMensagem(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const excluido = await TipoMensagem.deletarPorId(req.params.id);
        const tiposMensagem = await TipoMensagem.listarTiposMensagem();

        return res.render('pages/tipoMensagem/cadastrarTipoMensagem', {
            mensagem: excluido
                ? {
                    tipo: 'success',
                    valor: 'Tipo de mensagem excluído com sucesso.',
                    titulo: 'Exclusão realizada'
                }
                : {
                    tipo: 'error',
                    valor: 'Este tipo está associado a mensagens e não pode ser excluído.',
                    titulo: 'Tipo em uso'
                },
            usuario,
            tiposMensagem,
            tipoMensagemParaEditar: null
        });
    }
}
