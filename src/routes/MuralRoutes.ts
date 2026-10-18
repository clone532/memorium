import { Router } from "express";
import { MuralController } from "../controllers/MuralController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const muralRoutes = Router();

muralRoutes.get('/perfilUsuario/mural', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(MuralController.carregarMural));
muralRoutes.post('/perfilUsuario/mural', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(MuralController.criarMural));

export { muralRoutes };