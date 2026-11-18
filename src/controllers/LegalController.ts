import { Request, Response } from "express";
import { PRIVACIDADE_VERSAO, TERMOS_VERSAO } from "../constants/LegalDocuments";
import { Usuario } from "../models/Usuario";

export class LegalController {
    static carregarTermos(_req: Request, res: Response) {
        return res.render("legal/termos", { termosVersao: TERMOS_VERSAO });
    }

    static carregarPrivacidade(_req: Request, res: Response) {
        return res.render("legal/privacidade", { privacidadeVersao: PRIVACIDADE_VERSAO });
    }

    static async aceitarDocumentos(req: Request, res: Response) {
        const usuarioSessao = (req.session as any).usuario;
        const usuarioId = Number(usuarioSessao.id);

        if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
            return res.status(401).redirect("/usuario/logar");
        }

        if (req.body.aceitaTermos !== "on" || req.body.leuPrivacidade !== "on") {
            return res.status(400).render("legal/aceitarDocumentos", {
                termosVersao: TERMOS_VERSAO,
                privacidadeVersao: PRIVACIDADE_VERSAO,
                mensagem: "Para continuar, aceite os Termos de Uso e confirme a leitura do Aviso de Privacidade."
            });
        }

        await Usuario.registrarAceiteDocumentos(usuarioId, TERMOS_VERSAO, PRIVACIDADE_VERSAO);
        usuarioSessao.termosVersaoAceita = TERMOS_VERSAO;
        usuarioSessao.privacidadeVersaoLida = PRIVACIDADE_VERSAO;

        return req.session.save((error) => {
            if (error) {
                console.error("Erro ao salvar a sessão após o aceite dos documentos:", error);
                return res.status(500).send("Não foi possível concluir a atualização da sessão. Tente novamente.");
            }

            return res.redirect("/dashboard");
        });
    }
}
