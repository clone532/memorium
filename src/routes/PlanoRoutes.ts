import { Router } from "express";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from '../../utils/AsyncExecutor';
import { PlanoController } from "../controllers/PlanoController";

const planoRoutes = Router();

planoRoutes.get('/plano/planos', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(PlanoController.carregarPlanos));
planoRoutes.get('/plano/cadastrarListarPlanos', authMiddleware(['ADMIN']), asyncExecutor(PlanoController.carregarGerenciarPlanos));
planoRoutes.get('/plano/editar/:id', authMiddleware(['ADMIN']), asyncExecutor(PlanoController.carregarGerenciarPlanosComEdicao));

planoRoutes.post('/plano/cadastrarListarPlanos', authMiddleware(['ADMIN']), asyncExecutor(PlanoController.cadastrarPlano));
planoRoutes.post('/plano/editar/:id', authMiddleware(['ADMIN']), asyncExecutor(PlanoController.editarPlano));
planoRoutes.post('/plano/excluir/:id', authMiddleware(['ADMIN']), asyncExecutor(PlanoController.excluirPlanos));
planoRoutes.post('/plano/assinar/:id', authMiddleware(['ADMIN','USUARIO', 'GUARDIAO']), asyncExecutor(PlanoController.assinar));

export {
    planoRoutes
}