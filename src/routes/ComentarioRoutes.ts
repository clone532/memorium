import { Router } from "express";
import { ComentarioController } from "../controllers/ComentarioController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const comentarioRoutes = Router();

comentarioRoutes.get('/perfilUsuario/comentarios', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(ComentarioController.carregarComentarios));
comentarioRoutes.post('/perfilUsuario/comentarios', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(ComentarioController.criarComentario));

export { comentarioRoutes };