import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { asyncExecutor } from '../../utils/AsyncExecutor';
import { upload } from '../middlewares/UploadMiddleware';

const usuarioRoutes = Router();

// ORDEM: GET -> POST
// ROTA USUÁRIO NÃO LOGADO
usuarioRoutes.get('/usuario/logar', asyncExecutor(UsuarioController.carregarLogin));
usuarioRoutes.post('/usuario/logar', asyncExecutor(UsuarioController.logar));
usuarioRoutes.post('/usuario/deslogar', asyncExecutor(UsuarioController.deslogar));
usuarioRoutes.post('/usuario/cadastrar', upload.single('imagem'), asyncExecutor(UsuarioController.cadastrarUsuario));

// ROTAS DO USUÁRIO COMUM
usuarioRoutes.get('/perfilUsuario/perfil/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(UsuarioController.carregarPerfil));
usuarioRoutes.get('/usuario/configuracaoPerfil', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(UsuarioController.carregarConfig));
usuarioRoutes.get('/usuario/editar/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), asyncExecutor(UsuarioController.carregarEditar));
usuarioRoutes.post('/usuario/configuracaoPerfil', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), upload.single('imagem'), asyncExecutor(UsuarioController.atualizarPerfil));
usuarioRoutes.post('/usuario/editar/:id', authMiddleware(['ADMIN', 'USUARIO', 'GUARDIAO']), upload.single('imagem'), asyncExecutor(UsuarioController.editar));

// ROTAS DO ADMIN
usuarioRoutes.get('/usuario/cadAdmin', authMiddleware(['ADMIN']), asyncExecutor(UsuarioController.carregarCadPorAdmin));
usuarioRoutes.get('/usuario/listar', authMiddleware([ 'ADMIN' ]), asyncExecutor(UsuarioController.carregarListar));
usuarioRoutes.post('/usuario/excluir/:id', authMiddleware(['ADMIN']), asyncExecutor(UsuarioController.excluir));
usuarioRoutes.post('/usuario/cadAdmin', authMiddleware(['ADMIN']), upload.single('imagem'), asyncExecutor(UsuarioController.cadUsuarioPorAdmin));

export {
    usuarioRoutes
}