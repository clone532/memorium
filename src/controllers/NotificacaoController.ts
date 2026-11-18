import { Request, Response } from "express";
import { Notificacao } from "../models/Notificacao";

export class NotificacaoController {
    private static lerIdsSelecionados(valor: unknown) {
        const valores = Array.isArray(valor) ? valor : [valor];
        if (
            valores.length === 0
            || valores.length > 20
            || valores.some((id) => typeof id !== "string" || !/^[1-9]\d*$/.test(id))
        ) {
            return null;
        }

        const ids = valores.map((id) => Number(id));
        if (ids.some((id) => !Number.isSafeInteger(id)) || new Set(ids).size !== ids.length) {
            return null;
        }
        return ids;
    }

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

    static async marcarSelecionadasComoLidas(req: Request, res: Response) {
        const ids = NotificacaoController.lerIdsSelecionados(req.body.ids);
        if (!ids) {
            return res.status(400).json({ erro: "Selecione notificações válidas." });
        }

        const usuario = (req.session as any).usuario;
        await Notificacao.marcarSelecionadasComoLidas(ids, Number(usuario.id));
        return res.sendStatus(204);
    }

    static async excluirSelecionadas(req: Request, res: Response) {
        const ids = NotificacaoController.lerIdsSelecionados(req.body.ids);
        if (!ids) {
            return res.status(400).json({ erro: "Selecione notificações válidas." });
        }

        const usuario = (req.session as any).usuario;
        await Notificacao.excluirSelecionadas(ids, Number(usuario.id));
        return res.sendStatus(204);
    }
}
