import { Router } from "express";
import { AssinaturaController } from "../controllers/AssinaturaController";
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { asyncExecutor } from "../../utils/AsyncExecutor";

const assinaturaRoutes = Router();

assinaturaRoutes.get('/assinatura/cadastrarAssinatura', authMiddleware(['ADMIN']), asyncExecutor(AssinaturaController.carregarCadastrarAssinatura));
assinaturaRoutes.post('/assinatura/cadastrarAssinatura', authMiddleware(['ADMIN']), asyncExecutor(AssinaturaController.cadastrarAssinatura));

assinaturaRoutes.get('/assinatura/assinatura/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(AssinaturaController.carregarAssinatura));

export { assinaturaRoutes };