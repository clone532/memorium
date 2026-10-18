import { Router } from "express";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";
import { TipoMensagemController } from "../controllers/TipoMensagemController";

const tipoMensagemRoutes = Router();

tipoMensagemRoutes.get('/tipoMensagem/cadastrarTipoMensagem', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.carregarTipoMensagem));
tipoMensagemRoutes.post('/tipoMensagem/cadastrarTipoMensagem', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.cadastrarTipoMensagem));
tipoMensagemRoutes.get('/tipoMensagem/editar/:id', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.carregarEdicaoTipoMensagem));
tipoMensagemRoutes.post('/tipoMensagem/editar/:id', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.editarTipoMensagem));
tipoMensagemRoutes.post('/tipoMensagem/excluir/:id', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.excluirTipoMensagem));

export {
    tipoMensagemRoutes
}