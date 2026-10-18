import { Request, Response } from "express";
import { Mensagem } from "../models/Mensagem";

export class MensagemController {
    static async carregarGerenciar(req: Request, res: Response) {
        res.render('pages/mensagem/gerenciar', {
            mensagem: null
        });
    }
}