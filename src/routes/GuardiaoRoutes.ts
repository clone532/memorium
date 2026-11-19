import { Router } from "express";
import { GuardiaoController } from "../controllers/GuardiaoController";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { asyncExecutor } from "../../utils/AsyncExecutor";

const guardiaoRoutes = Router();

// Telas de acesso por token dos convites enviados por e-mail.
guardiaoRoutes.get('/guardiao/vinculo/confirmar', asyncExecutor(GuardiaoController.carregarConfirmarVinculo));
guardiaoRoutes.post('/guardiao/vinculo/confirmar', asyncExecutor(GuardiaoController.confirmarVinculo));
guardiaoRoutes.get('/guardiao/falecimento/confirmar', asyncExecutor(GuardiaoController.carregarConfirmarFalecimento));
guardiaoRoutes.post('/guardiao/falecimento/confirmar', asyncExecutor(GuardiaoController.confirmarFalecimento));

// Área e ações disponíveis para usuários autenticados.
guardiaoRoutes.get('/guardiao/gerenciar', authMiddleware(['USUARIO', 'GUARDIAO', 'ADMIN']), asyncExecutor(GuardiaoController.carregarGerenciar));
guardiaoRoutes.get('/guardiao/cadastrar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.carregarCadastrar));
guardiaoRoutes.post('/guardiao/cadastrar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.cadastrarGuardiao));
guardiaoRoutes.get('/guardiao/falecimento', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.carregarSolicitacaoFalecimento));
guardiaoRoutes.post('/guardiao/falecimento', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.iniciarSolicitacaoFalecimento));

export {
    guardiaoRoutes
}