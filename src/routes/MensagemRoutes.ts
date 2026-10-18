import { Router } from "express";
import { MensagemController } from "../controllers/MensagemController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";
import { TipoMensagemController } from "../controllers/TipoMensagemController";

const mensagemRoutes = Router();

//GET -> POST
//ROTAS USUARIO COMUM
mensagemRoutes.get('/mensagem/gerenciar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarGerenciar));
mensagemRoutes.get('/tipoMensagem/cadastrarTipoMensagem', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.carregarTipoMensagem));

export {
    mensagemRoutes
}