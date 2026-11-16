import { Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import { transporter } from "../infra/mail/NodeMailer";
import { UsuarioGuardiao } from "../models/UsuarioGuardiao";
import { SolicitacaoFalecimento } from "../models/SolicitacaoFalecimento";

export class GuardiaoController {
    static async carregarCadastrar(req: Request, res: Response) {
        return res.render('pages/guardiao/cadastrar', {
            mensagem: null,
            titulo: 'Cadastrar Guardião',
            guardiaoForm: { nome: '', email: '', numero: '' }
        });
    }

    static async cadastrarGuardiao(req: Request, res: Response) {
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
                valor: 'Informe nome, e-mail válido e telefone dentro dos limites permitidos.',
                titulo: 'Dados inválidos'
            }, 400);
        }

        const usuario = (req.session as any).usuario;
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const estado = await UsuarioGuardiao.prepararConvite(
            Number(usuario.id),
            { nome, email, numero },
            tokenHash
        );

        if (estado === 'confirmado') {
            return renderFormulario({
                tipo: 'error',
                valor: 'Este guardião já confirmou o vínculo com sua conta.',
                titulo: 'Vínculo já confirmado'
            }, 409);
        }

        try {
            const baseUrl = process.env.APP_BASE_URL
                || (process.env.NODE_ENV === 'production'
                    ? ''
                    : `http://localhost:${process.env.PORT || 3333}`);
            if (!baseUrl || !process.env.EMAIL_USER) {
                throw new Error('APP_BASE_URL e EMAIL_USER precisam estar configurados para enviar convites.');
            }

            const conviteUrl = new URL('/guardiao/vinculo/confirmar', baseUrl);
            conviteUrl.searchParams.set('token', token);

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Confirme seu vínculo como guardião',
                text: `Olá, ${nome}.\n\n${usuario.nome} cadastrou você como guardião no Memorium. Confirme o vínculo neste link (válido por 7 dias):\n\n${conviteUrl.toString()}\n\nSe você não reconhece esta solicitação, ignore este e-mail.`
            });

            const conviteAtualizado = await UsuarioGuardiao.marcarConviteEnviado(tokenHash);
            if (!conviteAtualizado) {
                throw new Error('O convite deixou de estar pendente antes de ser registrado como enviado.');
            }
        } catch (error) {
            console.error('Não foi possível enviar o convite de guardião:', error);
            return renderFormulario({
                tipo: 'error',
                valor: 'O vínculo ficou pendente, mas o e-mail não foi enviado. Confira a configuração de e-mail e cadastre novamente os mesmos dados para reenviar o convite.',
                titulo: 'Falha ao enviar convite'
            }, 502);
        }

        return renderFormulario({
            tipo: 'success',
            valor: 'Convite enviado. O guardião precisa confirmar o vínculo pelo link recebido por e-mail.',
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