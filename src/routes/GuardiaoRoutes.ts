import { Router } from "express";
import { GuardiaoController } from "../controllers/GuardiaoController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const guardiaoRoutes = Router();

guardiaoRoutes.get('/guardiao/vinculo/confirmar', asyncExecutor(GuardiaoController.carregarConfirmarVinculo));
guardiaoRoutes.get('/guardiao/gerenciar', asyncExecutor(GuardiaoController.carregarGerenciar));
guardiaoRoutes.post('/guardiao/vinculo/confirmar', asyncExecutor(GuardiaoController.confirmarVinculo));
guardiaoRoutes.get('/guardiao/falecimento', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.carregarSolicitacaoFalecimento));
guardiaoRoutes.post('/guardiao/falecimento', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.iniciarSolicitacaoFalecimento));
guardiaoRoutes.get('/guardiao/falecimento/confirmar', asyncExecutor(GuardiaoController.carregarConfirmarFalecimento));
guardiaoRoutes.post('/guardiao/falecimento/confirmar', asyncExecutor(GuardiaoController.confirmarFalecimento));
guardiaoRoutes.get('/guardiao/cadastrar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.carregarCadastrar));
guardiaoRoutes.post('/guardiao/cadastrar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.cadastrarGuardiao));

export {
    guardiaoRoutes
}