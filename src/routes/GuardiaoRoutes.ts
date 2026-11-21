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
guardiaoRoutes.post('/api/convites/codigo', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.gerarCodigoConvite));
guardiaoRoutes.post('/api/convites/vincular', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.vincularPorCodigoConvite));
guardiaoRoutes.get('/guardiao/listarTodos', authMiddleware(['ADMIN']), asyncExecutor(GuardiaoController.carregarListarTodos));
guardiaoRoutes.get('/guardiao/listar', authMiddleware(['USUARIO', 'GUARDIAO', 'ADMIN']), asyncExecutor(GuardiaoController.carregarListar));
guardiaoRoutes.get('/guardiao/solicitarVinculo', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.carregarSolicitarVinculo));
guardiaoRoutes.post('/guardiao/solicitarVinculo', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.solicitarVinculo));
guardiaoRoutes.post('/api/vinculos/:id/aceitar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.aceitarSolicitacaoVinculo));
guardiaoRoutes.post('/api/vinculos/:id/recusar', authMiddleware(['USUARIO', 'ADMIN']), asyncExecutor(GuardiaoController.recusarSolicitacaoVinculo));
guardiaoRoutes.get('/guardiao/cadastrar', authMiddleware(['USUARIO']), asyncExecutor(GuardiaoController.carregarCadastrar));
guardiaoRoutes.post('/guardiao/cadastrar', authMiddleware(['USUARIO']), asyncExecutor(GuardiaoController.cadastrarGuardiao));
guardiaoRoutes.get('/guardiao/usuarios', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.carregarUsuariosVinculados));
guardiaoRoutes.post('/guardiao/usuarios/:id/confirmar-obito', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.confirmarObitoUsuario));
guardiaoRoutes.get('/guardiao/falecimento', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.carregarSolicitacaoFalecimento));
guardiaoRoutes.post('/guardiao/falecimento', authMiddleware(['GUARDIAO']), asyncExecutor(GuardiaoController.iniciarSolicitacaoFalecimento));

export {
    guardiaoRoutes
}