import { Router } from "express";
import { MensagemController } from "../controllers/MensagemController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";
import { TipoMensagemController } from "../controllers/TipoMensagemController";
import { NotificacaoController } from "../controllers/NotificacaoController";
import { uploadAnexosMensagem } from "../middlewares/UploadMiddleware";

const mensagemRoutes = Router();

//GET -> POST
//ROTAS USUARIO COMUM
mensagemRoutes.get('/mensagem/gerenciar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarGerenciar));
mensagemRoutes.get('/mensagem/cadastrar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarCadastrar));
mensagemRoutes.get('/mensagem/listar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.carregarListar));
mensagemRoutes.post('/mensagem/excluir/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.excluir));
mensagemRoutes.get('/api/notificacoes', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(NotificacaoController.listar));
mensagemRoutes.post('/api/notificacoes/selecionadas/lidas', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(NotificacaoController.marcarSelecionadasComoLidas));
mensagemRoutes.post('/api/notificacoes/selecionadas/excluir', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(NotificacaoController.excluirSelecionadas));
mensagemRoutes.post('/api/notificacoes/:id/lida', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(NotificacaoController.marcarComoLida));
mensagemRoutes.get('/api/mensagens', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(MensagemController.listar));
mensagemRoutes.post('/api/mensagens', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), uploadAnexosMensagem, asyncExecutor(MensagemController.criar));
mensagemRoutes.post('/mensagem/cadastrar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), uploadAnexosMensagem, asyncExecutor(MensagemController.criar));
mensagemRoutes.get('/tipoMensagem/cadastrarTipoMensagem', authMiddleware(['ADMIN']), asyncExecutor(TipoMensagemController.carregarTipoMensagem));

export {
    mensagemRoutes
}