import { Request, Response } from "express";
import { Notificacao } from "../models/Notificacao";

export class NotificacaoController {
    static async listar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const resultado = await Notificacao.listarDoUsuario(Number(usuario.id));
        return res.json(resultado);
    }

    static async marcarComoLida(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({ erro: "Notificação inválida." });
        }

        const atualizada = await Notificacao.marcarComoLida(id, Number(usuario.id));
        if (!atualizada) {
            return res.status(404).json({ erro: "Notificação não encontrada." });
        }
        return res.sendStatus(204);
    }
}
