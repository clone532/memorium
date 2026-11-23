import { Router } from "express";
import { ComentarioController } from "../controllers/ComentarioController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const comentarioRoutes = Router();

comentarioRoutes.get('/perfilUsuario/comentarios', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(ComentarioController.carregarComentarios));
comentarioRoutes.post('/perfilUsuario/comentarios', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(ComentarioController.criarComentario));
comentarioRoutes.post('/perfilUsuario/perfil/:id/comentarios', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(ComentarioController.criarComentario));
comentarioRoutes.post('/perfilUsuario/perfil/:id/comentarios/:comentarioId/excluir', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(ComentarioController.deletarComentario));

export { comentarioRoutes };