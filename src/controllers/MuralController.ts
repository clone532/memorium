import { Request, Response } from "express";

export class MuralController {
    static carregarMural(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        return res.redirect(`/perfilUsuario/perfil/${usuario.id}#mural`);
    }
}
