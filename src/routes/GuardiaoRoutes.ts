import { Router } from "express";
import { GuardiaoController } from "../controllers/GuardiaoController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const guardiaoRoutes = Router();

guardiaoRoutes.get('/guardiao/cadastrar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.carregarCadastrar));

export {
    guardiaoRoutes
}