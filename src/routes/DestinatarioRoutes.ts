import { Router } from "express";
import { DestinatarioController } from "../controllers/DestinatarioController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const destinatarioRoutes = Router();

destinatarioRoutes.get('/destinatario/cadastrarListar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.carregarCadastrarListar));
destinatarioRoutes.get('/destinatario/cadastrarListar/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.carregarCadastrarListarComEdicao));
destinatarioRoutes.get('/destinatario/cadastrar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.carregarCadastrar));
destinatarioRoutes.get('/destinatario/editar/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.carregarCadastrarListarComEdicao));
destinatarioRoutes.get('/destinatario/editar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.carregarEditar));

destinatarioRoutes.post('/destinatario/cadastrar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.cadastrar));
destinatarioRoutes.post('/destinatario/cadastrarListar', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.cadastrar));
destinatarioRoutes.post('/destinatario/cadastrarListar/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.excluir));
destinatarioRoutes.post('/destinatario/editar/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(DestinatarioController.editar));

export {
    destinatarioRoutes
}