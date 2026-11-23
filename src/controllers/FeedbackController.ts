import { Request, Response } from "express";
import { transporter } from "../infra/mail/NodeMailer";

const destinatarioFeedback = "tccmemorium@gmail.com";

export class FeedbackController {
    static carregarFeedback(req: Request, res: Response) {
        const { usuario } = req.session as any;
        res.render('pages/feedback', 
            { 
                titulo: 'Feedback',
                usuario,
                feedbackTexto: '',
                feedbackEnviado: false,
                erroFeedback: ''
            });
    }

    static async enviarFeedback(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const mensagem = typeof req.body.feedback === "string" ? req.body.feedback.trim() : "";

        if (!mensagem) {
            return res.status(400).render('pages/feedback', {
                titulo: 'Feedback',
                usuario,
                feedbackTexto: '',
                feedbackEnviado: false,
                erroFeedback: 'Escreva sua mensagem antes de enviar.'
            });
        }

        if (!process.env.EMAIL_USER) {
            return res.status(500).render('pages/feedback', {
                titulo: 'Feedback',
                usuario,
                feedbackTexto: mensagem,
                feedbackEnviado: false,
                erroFeedback: 'O envio de e-mail não está configurado. Tente novamente mais tarde.'
            });
        }

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: destinatarioFeedback,
                subject: 'Feedback - Memorium',
                text: mensagem
            });
        } catch (error) {
            console.error('Erro ao enviar feedback por e-mail:', error);
            return res.status(502).render('pages/feedback', {
                titulo: 'Feedback',
                usuario,
                feedbackTexto: mensagem,
                feedbackEnviado: false,
                erroFeedback: 'Não foi possível enviar seu feedback. Tente novamente mais tarde.'
            });
        }

        return res.render('pages/feedback', {
            titulo: 'Feedback',
            usuario,
            feedbackTexto: '',
            feedbackEnviado: true,
            erroFeedback: ''
        });
    }
}