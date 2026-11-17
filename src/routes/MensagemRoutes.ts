import { Router } from "express";
import { MensagemController } from "../controllers/MensagemController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";
import { TipoMensagemController } from "../controllers/TipoMensagemController";
import { uploadAnexosMensagem } from "../middlewares/UploadMiddleware";

const mensagemRoutes = Router();

//GET -> POST
//ROTAS USUARIO COMUM
mensagemRoutes.get('/mensagem/gerenciar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarGerenciar));
mensagemRoutes.get('/mensagem/cadastrar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarCadastrar));
mensagemRoutes.get('/mensagem/listar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarListar));
mensagemRoutes.get('/api/mensagens', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.listar));
mensagemRoutes.post('/api/mensagens', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), uploadAnexosMensagem, asyncExecutor(MensagemController.criar));
mensagemRoutes.post('/mensagem/cadastrar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), uploadAnexosMensagem, asyncExecutor(MensagemController.criar));
mensagemRoutes.get('/tipoMensagem/cadastrarTipoMensagem', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.carregarTipoMensagem));

export {
    mensagemRoutes
}