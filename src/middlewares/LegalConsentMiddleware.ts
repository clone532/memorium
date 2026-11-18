import { NextFunction, Request, Response } from "express";
import { PRIVACIDADE_VERSAO, TERMOS_VERSAO } from "../constants/LegalDocuments";

const rotasPermitidasSemAceite = new Set([
    "/termos",
    "/privacidade",
    "/usuario/logar",
    "/usuario/cadastrar",
    "/usuario/deslogar",
    "/usuario/aceitar-documentos"
]);

export function legalConsentMiddleware(req: Request, res: Response, next: NextFunction) {
    const usuario = (req.session as any)?.usuario;

    if (!usuario || rotasPermitidasSemAceite.has(req.path)) {
        return next();
    }

    if (
        usuario.termosVersaoAceita === TERMOS_VERSAO
        && usuario.privacidadeVersaoLida === PRIVACIDADE_VERSAO
    ) {
        return next();
    }

    return res.redirect("/usuario/aceitar-documentos");
}
