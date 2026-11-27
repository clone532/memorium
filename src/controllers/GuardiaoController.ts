import { Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import { transporter } from "../infra/mail/NodeMailer";
import { UsuarioGuardiao } from "../models/UsuarioGuardiao";
import { SolicitacaoFalecimento } from "../models/SolicitacaoFalecimento";
import { Usuario } from "../models/Usuario";
import { TipoUsuario } from "../models/TipoUsuario";
import { TipoUsuarioEnum } from "../enums/TipoUsuario";
import { TERMOS_VERSAO, PRIVACIDADE_VERSAO } from "../constants/LegalDocuments";
import { Guardiao } from "../models/Guardiao";
import { Notificacao } from "../models/Notificacao";

export class GuardiaoController {
    static async gerarCodigoConvite(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const idUsuario = Number(usuario?.id);
        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            return res.status(401).json({ erro: 'Sessão inválida.' });
        }

        const codigo = await Usuario.gerarCodigoConvite(idUsuario);
        return res.json({ codigo });
    }

    static async vincularPorCodigoConvite(req: Request, res: Response) {
        const guardiaoSessao = (req.session as any).usuario;
        const codigo = typeof req.body.codigo === 'string' ? req.body.codigo.trim() : '';
        if (!/^\d{6}$/.test(codigo)) {
            return res.status(400).json({ erro: 'Informe o código de convite com 6 dígitos.' });
        }

        const usuarioEncontrado = await Usuario.buscarPorCodigoConvite(codigo);
        if (!usuarioEncontrado) {
            return res.status(404).json({ erro: 'Código inválido, expirado ou não encontrado.' });
        }
        if (Number(usuarioEncontrado.id) === Number(guardiaoSessao.id)) {
            return res.status(400).json({ erro: 'Você não pode vincular este código a si mesmo.' });
        }

        const resultado = await UsuarioGuardiao.solicitarVinculo(
            Number(usuarioEncontrado.id),
            {
                nome: guardiaoSessao.nome,
                email: guardiaoSessao.email,
                numero: guardiaoSessao.numero || ''
            }
        );

        if (resultado.estado === 'confirmado') {
            return res.status(409).json({ erro: 'Este usuário já possui um vínculo confirmado com você.' });
        }

        await Notificacao.criarSolicitacaoVinculo(
            Number(usuarioEncontrado.id),
            'Solicitação de vínculo',
            `${guardiaoSessao.nome} solicitou vínculo como seu guardião.`,
            resultado.idVinculo
        );

        return res.json({
            sucesso: true,
            usuario: usuarioEncontrado.nome,
            mensagem: resultado.estado === 'pendente'
                ? 'A solicitação já estava pendente.'
                : 'Solicitação enviada ao usuário.'
        });
    }

    static async carregarSolicitarVinculo(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
        const usuarioEncontrado = email
            ? await Usuario.buscarPorEmail(email)
            : null;

        const resultado = usuarioEncontrado
            && usuarioEncontrado.id !== usuario.id
            && (
                usuarioEncontrado.tipoUsuario.nome === TipoUsuarioEnum.USUARIO
                || usuarioEncontrado.tipoUsuario.nome === TipoUsuarioEnum.ADMIN
            )
            ? usuarioEncontrado
            : null;

        return res.render('pages/guardiao/solicitarVinculo', {
            titulo: 'Solicitar vínculo',
            usuario,
            email,
            usuarioEncontrado: resultado,
            mensagem: null
        });
    }

    static async solicitarVinculo(req: Request, res: Response) {
        const guardiaoSessao = (req.session as any).usuario;
        const idUsuario = Number(req.body.idUsuario);
        const emailBusca = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

        const render = (mensagem: { tipo: 'error' | 'success'; valor: string; titulo: string }, usuarioEncontrado: Usuario | null = null, status = 200) =>
            res.status(status).render('pages/guardiao/solicitarVinculo', {
                titulo: 'Solicitar vínculo',
                usuario: guardiaoSessao,
                email: emailBusca,
                usuarioEncontrado,
                mensagem
            });

        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            return render({
                tipo: 'error',
                valor: 'Informe um usuário válido.',
                titulo: 'Usuário inválido'
            }, null, 400);
        }

        const usuarioEncontrado = await Usuario.buscarPorId(String(idUsuario));
        if (
            !usuarioEncontrado
            || (
                usuarioEncontrado.tipoUsuario.nome !== TipoUsuarioEnum.USUARIO
                && usuarioEncontrado.tipoUsuario.nome !== TipoUsuarioEnum.ADMIN
            )
        ) {
            return render({
                tipo: 'error',
                valor: 'Nenhum usuário foi encontrado para este e-mail.',
                titulo: 'Usuário não encontrado'
            }, null, 404);
        }
        if (Number(usuarioEncontrado.id) === Number(guardiaoSessao.id)) {
            return render({
                tipo: 'error',
                valor: 'Você não pode solicitar vínculo consigo mesmo.',
                titulo: 'Ação inválida'
            }, usuarioEncontrado, 400);
        }

        const resultado = await UsuarioGuardiao.solicitarVinculo(
            Number(usuarioEncontrado.id),
            {
                nome: guardiaoSessao.nome,
                email: guardiaoSessao.email,
                numero: guardiaoSessao.numero || ''
            }
        );

        if (resultado.estado === 'confirmado') {
            return render({
                tipo: 'error',
                valor: 'Este usuário já possui um vínculo confirmado com você.',
                titulo: 'Vínculo já confirmado'
            }, usuarioEncontrado, 409);
        }
        await Notificacao.criarSolicitacaoVinculo(
            Number(usuarioEncontrado.id),
            'Solicitação de vínculo',
            `${guardiaoSessao.nome} solicitou vínculo como seu guardião.`,
            resultado.idVinculo
        );

        return render({
            tipo: 'success',
            valor: resultado.estado === 'pendente'
                ? 'A solicitação já estava pendente. A notificação foi disponibilizada novamente para o usuário.'
                : 'Solicitação enviada. O usuário pode aceitar ou recusar pela área de notificações.',
            titulo: resultado.estado === 'pendente' ? 'Notificação reenviada' : 'Solicitação enviada'
        }, usuarioEncontrado);
    }

    static async aceitarSolicitacaoVinculo(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const idVinculo = Number(req.params.id);
        if (!Number.isSafeInteger(idVinculo) || idVinculo <= 0) {
            return res.status(400).json({ erro: 'Solicitação inválida.' });
        }

        const atualizada = await UsuarioGuardiao.responderSolicitacao(idVinculo, Number(usuario.id), true);
        if (!atualizada) {
            return res.status(404).json({ erro: 'Solicitação não encontrada.' });
        }

        await Notificacao.marcarComoLidaPorReferencia(idVinculo, Number(usuario.id), 'solicitacao_vinculo');
        return res.json({ sucesso: true });
    }

    static async recusarSolicitacaoVinculo(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const idVinculo = Number(req.params.id);
        if (!Number.isSafeInteger(idVinculo) || idVinculo <= 0) {
            return res.status(400).json({ erro: 'Solicitação inválida.' });
        }

        const atualizada = await UsuarioGuardiao.responderSolicitacao(idVinculo, Number(usuario.id), false);
        if (!atualizada) {
            return res.status(404).json({ erro: 'Solicitação não encontrada.' });
        }

        await Notificacao.marcarComoLidaPorReferencia(idVinculo, Number(usuario.id), 'solicitacao_vinculo');
        return res.json({ sucesso: true });
    }

    static async carregarListarTodos(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const guardioes = await Guardiao.listarTodosParaAdministrador();

        return res.render('pages/guardiao/listarTodos', {
            titulo: 'Todos os guardiões',
            usuario,
            guardioes,
            mensagem: null
        });
    }

    static async carregarListar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const guardioes = await UsuarioGuardiao.listarGuardioesConfirmados(Number(usuario.id));

        return res.render('pages/guardiao/listar', {
            titulo: 'Meus guardiões',
            usuario,
            guardioes,
            mensagem: null
        });
    }

    static async carregarGerenciar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        return res.render('pages/guardiao/gerenciar', {
            titulo: 'Gerenciar guardiões',
            usuario,
            mensagem: null
        });
    }
    static async carregarCadastrar(req: Request, res: Response) {
        return res.render('pages/guardiao/cadastrar', {
            mensagem: null,
            titulo: 'Cadastrar Guardião',
            guardiaoForm: { nome: '', email: '', numero: '' }
        });
    }

    static async cadastrarGuardiao(req: Request, res: Response) {
        const usuarioSessao = (req.session as any).usuario;
        const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const numero = typeof req.body.numero === 'string' ? req.body.numero.trim() : '';
        const guardiaoForm = { nome, email, numero };

        const renderFormulario = (
            mensagem: { tipo: 'error' | 'success', valor: string, titulo: string },
            status = 200,
            formulario = guardiaoForm
        ) => res.status(status).render('pages/guardiao/cadastrar', {
            mensagem,
            titulo: 'Cadastrar Guardião',
            guardiaoForm: formulario
        });

        if (
            !nome || nome.length > 255
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255
            || !numero || numero.length > 20
        ) {
            return renderFormulario({
                tipo: 'error',
                valor: 'Informe nome, seu próprio e-mail e telefone.',
                titulo: 'Dados inválidos'
            }, 400);
        }

        const tipoGuardiao = await TipoUsuario.buscarPorNome(TipoUsuarioEnum.GUARDIAO);
        if (!tipoGuardiao) {
            return renderFormulario({
                tipo: 'error',
                valor: 'O tipo Guardião não está configurado no sistema.',
                titulo: 'Erro do sistema'
            }, 500);
        }

        try {
            if (!usuarioSessao || usuarioSessao.tipo !== 'USUARIO') {
                return renderFormulario({
                    tipo: 'error',
                    valor: 'Somente usuários podem solicitar a mudança para guardião.',
                    titulo: 'Ação não permitida'
                }, 403);
            }

            const usuarioEncontrado = await Usuario.buscarPorId(String(usuarioSessao.id));
            if (!usuarioEncontrado || Usuario.normalizarEmail(usuarioEncontrado.email) !== Usuario.normalizarEmail(email)) {
                return renderFormulario({
                    tipo: 'error',
                    valor: 'Informe o e-mail da sua própria conta de usuário.',
                    titulo: 'E-mail inválido'
                }, 403);
            }

            await Usuario.promoverParaGuardiao(
                Number(usuarioSessao.id),
                tipoGuardiao.id,
                nome,
                numero,
                email
            );
            usuarioSessao.tipo = TipoUsuarioEnum.GUARDIAO;
            usuarioSessao.nome = nome;
            usuarioSessao.numero = numero;
            (req.session as any).usuario = usuarioSessao;
        } catch (error) {
            console.error('Não foi possível cadastrar o guardião:', error);
            return renderFormulario({
                tipo: 'error',
                valor: 'Não foi possível cadastrar o guardião.',
                titulo: 'Falha no cadastro'
            }, 500);
        }

        return renderFormulario({
            tipo: 'success',
            valor: 'Conta de guardião cadastrada com sucesso.',
            titulo: 'Sucesso'
        }, 200, { nome: '', email: '', numero: '' });
    }

    static async carregarConfirmarVinculo(req: Request, res: Response) {
        const token = typeof req.query.token === 'string' ? req.query.token : '';
        const tokenHash = /^[a-f0-9]{64}$/i.test(token)
            ? createHash('sha256').update(token).digest('hex')
            : '';
        const convite = tokenHash
            ? await UsuarioGuardiao.buscarConviteValido(tokenHash)
            : null;

        if (!convite) {
            return res.status(410).render('pages/guardiao/confirmarVinculo', {
                titulo: 'Convite inválido',
                token: '',
                guardiao: null,
                mensagem: 'Este link já foi usado, expirou ou não é válido.'
            });
        }

        return res.render('pages/guardiao/confirmarVinculo', {
            titulo: 'Confirmar vínculo',
            token,
            guardiao: convite,
            mensagem: null
        });
    }

    static async confirmarVinculo(req: Request, res: Response) {
        const token = typeof req.body.token === 'string' ? req.body.token : '';
        const tokenHash = /^[a-f0-9]{64}$/i.test(token)
            ? createHash('sha256').update(token).digest('hex')
            : '';
        const confirmado = tokenHash
            ? await UsuarioGuardiao.confirmarConvite(tokenHash)
            : false;

        if (!confirmado) {
            return res.status(410).render('pages/guardiao/confirmarVinculo', {
                titulo: 'Convite inválido',
                token: '',
                guardiao: null,
                mensagem: 'Este link já foi usado, expirou ou não é válido.'
            });
        }

        return res.render('pages/guardiao/confirmarVinculo', {
            titulo: 'Vínculo confirmado',
            token: '',
            guardiao: null,
            mensagem: 'Vínculo confirmado. Obrigado por ajudar a proteger as mensagens desta pessoa.'
        });
    }

    static async carregarConfirmarFalecimento(req: Request, res: Response) {
        const token = typeof req.query.token === 'string' ? req.query.token : '';
        const tokenHash = /^[a-f0-9]{64}$/i.test(token)
            ? createHash('sha256').update(token).digest('hex')
            : '';
        const convite = tokenHash
            ? await SolicitacaoFalecimento.buscarConvite(tokenHash)
            : null;

        if (!convite) {
            return res.status(410).render('pages/guardiao/confirmarFalecimento', {
                titulo: 'Convite inválido',
                token: '',
                guardiao: null,
                mensagem: 'Este link já foi usado, expirou ou não é válido.'
            });
        }

        return res.render('pages/guardiao/confirmarFalecimento', {
            titulo: 'Confirmar falecimento',
            token,
            guardiao: convite,
            mensagem: null
        });
    }

    static async carregarSolicitacaoFalecimento(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const usuarios = await SolicitacaoFalecimento.listarUsuariosParaGuardiao(usuario.email);
        return res.render('pages/guardiao/solicitarFalecimento', {
            titulo: 'Solicitar confirmação de falecimento',
            usuarios,
            mensagem: null
        });
    }

    static async carregarUsuariosVinculados(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const usuarios = await SolicitacaoFalecimento.listarUsuariosParaGuardiao(usuario.email);

        return res.render('pages/guardiao/usuarios', {
            titulo: 'Meus usuários',
            usuario,
            usuarios,
            mensagem: null
        });
    }

    static async confirmarObitoUsuario(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const idUsuario = Number(req.params.id);
        const render = async (
            mensagem: { tipo: 'error' | 'success'; valor: string; titulo: string },
            status = 200
        ) => {
            const usuarios = await SolicitacaoFalecimento.listarUsuariosParaGuardiao(usuario.email);
            return res.status(status).render('pages/guardiao/usuarios', {
                titulo: 'Meus usuários',
                usuario,
                usuarios,
                mensagem
            });
        };

        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            return render({
                tipo: 'error',
                valor: 'Selecione um usuário válido.',
                titulo: 'Usuário inválido'
            }, 400);
        }

        const idVinculo = await SolicitacaoFalecimento.buscarVinculoConfirmado(usuario.email, idUsuario);
        if (!idVinculo) {
            return render({
                tipo: 'error',
                valor: 'Você não possui vínculo confirmado com este usuário.',
                titulo: 'Vínculo inválido'
            }, 403);
        }

        const resultado = await SolicitacaoFalecimento.votar(idUsuario, idVinculo);
        const mensagens = {
            usuario_invalido: {
                tipo: 'error' as const,
                valor: 'Usuário não encontrado.',
                titulo: 'Não encontrado'
            },
            guardiao_nao_vinculado: {
                tipo: 'error' as const,
                valor: 'Você não possui vínculo confirmado com este usuário.',
                titulo: 'Vínculo inválido'
            },
            falecimento_ja_confirmado: {
                tipo: 'error' as const,
                valor: 'O falecimento deste usuário já foi confirmado.',
                titulo: 'Já confirmado'
            },
            guardioes_insuficientes: {
                tipo: 'error' as const,
                valor: 'São necessários pelo menos três guardiões confirmados para votar.',
                titulo: 'Guardiões insuficientes'
            },
            voto_ja_registrado: {
                tipo: 'error' as const,
                valor: 'Seu voto já foi registrado para este usuário.',
                titulo: 'Voto já registrado'
            }
        };

        if (
            resultado.estado !== 'aguardando_confirmacoes'
            && resultado.estado !== 'confirmada'
        ) {
            return render(mensagens[resultado.estado], 400);
        }

        if (resultado.estado === 'confirmada') {
            return render({
                tipo: 'success',
                valor: 'Voto registrado. O quórum foi atingido e o falecimento foi confirmado.',
                titulo: 'Confirmação concluída'
            });
        }

        return render({
            tipo: 'success',
            valor: `Voto registrado (${resultado.confirmacoes} de ${resultado.necessarias}).`,
            titulo: 'Voto registrado'
        });
    }

    static async cancelarConfirmacaoObitoUsuario(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const idUsuario = Number(req.params.id);
        const render = async (
            mensagem: { tipo: 'error' | 'success'; valor: string; titulo: string },
            status = 200
        ) => {
            const usuarios = await SolicitacaoFalecimento.listarUsuariosParaGuardiao(usuario.email);
            return res.status(status).render('pages/guardiao/usuarios', {
                titulo: 'Meus usuários',
                usuario,
                usuarios,
                mensagem
            });
        };

        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            return render({
                tipo: 'error',
                valor: 'Selecione um usuário válido.',
                titulo: 'Usuário inválido'
            }, 400);
        }

        const idVinculo = await SolicitacaoFalecimento.buscarVinculoConfirmado(usuario.email, idUsuario);
        if (!idVinculo) {
            return render({
                tipo: 'error',
                valor: 'Você não possui vínculo confirmado com este usuário.',
                titulo: 'Vínculo inválido'
            }, 403);
        }

        const resultado = await SolicitacaoFalecimento.cancelarVoto(idUsuario, idVinculo);
        if (resultado.estado !== 'voto_cancelado') {
            const mensagens = {
                usuario_invalido: {
                    tipo: 'error' as const,
                    valor: 'Usuário não encontrado.',
                    titulo: 'Não encontrado'
                },
                guardiao_nao_vinculado: {
                    tipo: 'error' as const,
                    valor: 'Você não possui vínculo confirmado com este usuário.',
                    titulo: 'Vínculo inválido'
                },
                falecimento_ja_confirmado: {
                    tipo: 'error' as const,
                    valor: 'O falecimento deste usuário já foi confirmado.',
                    titulo: 'Já confirmado'
                },
                solicitacao_nao_encontrada: {
                    tipo: 'error' as const,
                    valor: 'Não há uma confirmação de óbito pendente para cancelar.',
                    titulo: 'Solicitação não encontrada'
                },
                voto_nao_registrado: {
                    tipo: 'error' as const,
                    valor: 'Você não possui um voto registrado para este usuário.',
                    titulo: 'Voto não registrado'
                }
            };
            return render(mensagens[resultado.estado], 400);
        }

        return render({
            tipo: 'success',
            valor: 'Sua confirmação foi cancelada.',
            titulo: 'Confirmação cancelada'
        });
    }

    static async iniciarSolicitacaoFalecimento(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const idUsuario = Number(req.body.idUsuario);
        const usuarios = await SolicitacaoFalecimento.listarUsuariosParaGuardiao(usuario.email);
        const render = (mensagem: string, status = 200) =>
            res.status(status).render('pages/guardiao/solicitarFalecimento', {
                titulo: 'Solicitar confirmação de falecimento',
                usuarios,
                mensagem
            });

        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            return render('Selecione uma pessoa válida.', 400);
        }

        const idVinculo = await SolicitacaoFalecimento.buscarVinculoConfirmado(usuario.email, idUsuario);
        if (!idVinculo) {
            return render('Você não tem um vínculo confirmado com esta pessoa.', 403);
        }

        const resultado = await SolicitacaoFalecimento.iniciar(idUsuario, idVinculo);
        if (resultado.estado !== 'aguardando_confirmacoes') {
            const mensagens = {
                usuario_invalido: 'Usuário não encontrado.',
                guardiao_nao_vinculado: 'Vínculo de guardião inválido.',
                falecimento_ja_confirmado: 'O falecimento já foi confirmado.',
                guardioes_insuficientes: 'São necessários três guardiões confirmados para iniciar a solicitação.'
            };
            return render(mensagens[resultado.estado], 400);
        }

        const baseUrl = process.env.APP_BASE_URL
            || (process.env.NODE_ENV === 'production' ? '' : `http://localhost:${process.env.PORT || 3333}`);
        if (!baseUrl || !process.env.EMAIL_USER) {
            return render('A configuração de e-mail ou APP_BASE_URL está incompleta.', 500);
        }

        const falhas: string[] = [];
        for (const convite of resultado.convites) {
            try {
                const url = new URL('/guardiao/falecimento/confirmar', baseUrl);
                url.searchParams.set('token', convite.token);
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: convite.email,
                    subject: 'Confirmação de falecimento solicitada',
                    text: `Olá, ${convite.nome}.\n\nUm guardião solicitou a confirmação do falecimento de uma pessoa que você acompanha no Memorium. Sua confirmação individual é necessária para o quórum de três guardiões.\n\nConfirme neste link, válido por sete dias:\n${url.toString()}\n\nSe você não reconhece esta solicitação, ignore este e-mail.`
                });
            } catch (error) {
                console.error(`Falha ao enviar convite de confirmação para ${convite.email}:`, error);
                falhas.push(convite.email);
            }
        }

        if (falhas.length) {
            return render(`A solicitação foi criada, mas não foi possível enviar todos os convites (${falhas.length}). Tente novamente para reenviá-los.`, 502);
        }
        return render('Solicitação iniciada. Os três guardiões, incluindo você, receberam links individuais para confirmar.', 200);
    }

    static async confirmarFalecimento(req: Request, res: Response) {
        const token = typeof req.body.token === 'string' ? req.body.token : '';
        const tokenHash = /^[a-f0-9]{64}$/i.test(token)
            ? createHash('sha256').update(token).digest('hex')
            : '';
        const resultado = tokenHash
            ? await SolicitacaoFalecimento.confirmar(tokenHash)
            : { estado: 'invalida' as const };

        if (resultado.estado === 'invalida') {
            return res.status(410).render('pages/guardiao/confirmarFalecimento', {
                titulo: 'Convite inválido',
                token: '',
                guardiao: null,
                mensagem: 'Este link já foi usado, expirou ou não é válido.'
            });
        }

        const mensagem = resultado.estado === 'confirmada'
            ? 'Confirmação registrada. O quórum mínimo foi atingido e as mensagens sem data foram liberadas.'
            : `Confirmação registrada (${resultado.confirmacoes} de ${resultado.necessarias}).`;
        return res.render('pages/guardiao/confirmarFalecimento', {
            titulo: 'Confirmação registrada',
            token: '',
            guardiao: null,
            mensagem
        });
    }

}