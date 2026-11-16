import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { Usuario } from "../models/Usuario";
import { TipoUsuario } from "../models/TipoUsuario";
import { TipoUsuarioEnum } from "../enums/TipoUsuario";
import { Comentario } from "../models/Comentario";
import { Mural } from "../models/Mural";
import { Biografia } from "../models/Biografia";
import fs from "fs";
import path from "path";

export class UsuarioController {

    static podeEditarUsuario(req: Request, idUsuarioDestino: string | number) {
        const sessionUser = (req.session as any)?.usuario;

        if (!sessionUser) {
            return false;
        }

        const usuarioLogadoId = Number(sessionUser.id);
        const usuarioDestinoId = Number(idUsuarioDestino);

        return sessionUser.tipo === 'ADMIN' || usuarioLogadoId === usuarioDestinoId;
    }

// FUNÇÕES DE CARREGAR !!!!!!!

    static carregarLogin(req: Request, res: Response) {
        res.render('login', {
            mensagem: null
        });
    }

    static async carregarListar(req: Request, res: Response) {
        const { usuario } = req.session as any;

        const usuarios = await Usuario.buscarTodos();

        res.render('pages/usuario/listar', {
            usuario,
            usuarios,
            titulo: 'Listar Usuários',
            mensagem: null
        });
    }

    static async carregarConfig(req: Request, res: Response) {
        const { usuario } = req.session as any;

        const usuarioEncontrado = await Usuario.buscarPorId(usuario.id);

        if (!usuarioEncontrado) {
            return res.redirect('/usuario/logar');
        }

        res.render('pages/usuario/configuracaoPerfil', {
            usuario,
            usuarioPerfil: usuarioEncontrado,
            titulo: 'Configuração do Perfil',
            mensagem: null
        });
    }

    static async carregarEditar(req: Request, res: Response) {
        const { id } = req.params;
        const { usuario } = req.session as any;

        if (!UsuarioController.podeEditarUsuario(req, id)) {
            return res.redirect('/dashboard');
        }

        const usuarioEncontrado = await Usuario.buscarPorId(id);

        if(!usuarioEncontrado) {
            throw new Error('Usuário não encontrado');
        }

        return res.render('pages/usuario/editar', {
            titulo: 'Editar Usuário',
            mensagem: null,
            usuarioParaEditar: usuarioEncontrado,
            usuario
        });
    }

    static async carregarCadPorAdmin(req: Request, res: Response) {
        return res.render('pages/usuario/cadAdmin', {
            titulo: 'Cadastrar Usuário',
            mensagem: null
        });
    }
    
    static async carregarPerfil(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const idPerfil = Number(req.params.id);

        if (!Number.isSafeInteger(idPerfil) || idPerfil <= 0) {
            return res.status(404).send('Usuário não encontrado.');
        }

        const usuarioEncontrado = await Usuario.buscarPorId(String(idPerfil));

        if (!usuarioEncontrado) {
            return res.status(404).send('Usuário não encontrado.');
        }

        const mural = usuarioEncontrado.id
            ? await Mural.buscarPorUsuario(usuarioEncontrado.id)
            : null;
        const comentarios = mural?.id
            ? await Comentario.buscarPorMural(mural.id)
            : [];
        const biografias = await Biografia.buscarPorUsuario(usuarioEncontrado.id!);

        return res.render('pages/perfilUsuario/perfil', {
            usuario,
            usuarioPerfil: usuarioEncontrado,
            comentarios,
            biografias,
            ehProprioPerfil: Number(usuario.id) === Number(usuarioEncontrado.id),
            abaInicial: req.query.aba === 'mural' ? 'mural' : 'biografia',
            mensagemBiografia: req.query.erro === 'publicacao'
                ? {
                    tipo: 'error',
                    valor: 'Escreva um texto de até 5.000 caracteres ou selecione um arquivo.',
                    titulo: 'Publicação inválida'
                }
                : null,
            mensagem: req.query.erro === 'comentario'
                ? {
                    tipo: 'error',
                    valor: 'O comentário deve conter de 1 a 500 caracteres.',
                    titulo: 'Comentário inválido'
                }
                : null,
            titulo: 'Perfil do Usuário',
        });
    }

//FUNÇÕES DE CADASTRO !!!!!!

    static async cadastrarUsuario(req: Request, res: Response) {
        const { nome, email, senha, dataNasc } = req.body;

        if (!nome || !email || !senha || !dataNasc) {
            return res.render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha corretamente os dados!',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const usuarioEncontrado = await Usuario.buscarPorEmail(email);

        if (usuarioEncontrado) {
            return res.render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'E-mail já existe',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const tipoPadrao = await TipoUsuario.buscarPorNome(TipoUsuarioEnum.USUARIO);
        if (!tipoPadrao) {
            return res.render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Tipo de usuário padrão não encontrado',
                    titulo: 'Erro do sistema'
                }
            });
        }

        const usuario: Usuario = new Usuario({
            nome,
            email,
            senha,
            dataNasc,
            estaMorto: false,
            numero: '',
            tipoUsuario: tipoPadrao
        });

        await Usuario.cadastrarUsuario(usuario);

        res.render('login', {
            mensagem: {
                tipo: 'success',
                valor: 'Usuário cadastrado com sucesso',
                titulo: 'Sucesso'
            }
        });
    }

    static async cadUsuarioPorAdmin(req: Request, res: Response) {
        const { nome, email, senha, dataNasc, tipo } = req.body;

        const tipoUsuario = await TipoUsuario.buscarPorNome(tipo);
        if (!tipoUsuario) {
            return res.status(400).render('pages/usuario/cadAdmin', {
                titulo: 'Cadastrar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: 'Selecione um tipo de usuário válido.'
                }
            });
        }

        const usuarioEncontrado = await Usuario.buscarPorEmail(email);

        if (usuarioEncontrado) {
            return res.render('pages/usuario/cadastrar', {
                titulo: 'Cadastrar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: 'E-mail já existe',
                    titulo: 'Dados inválidos'
                },
            });
        }

        const novoUsuario = new Usuario({
            nome,
            email,
            senha,
            dataNasc,
            estaMorto: false,
            numero: '',
            tipoUsuario
        });

        await Usuario.cadastrarUsuario(novoUsuario);

        return res.render('pages/usuario/cadAdmin', {
            titulo: 'Cadastrar Usuário',
            mensagem: {
                tipo: 'success',
                valor: 'Usuário cadastrado com sucesso!',
                titulo: 'Sucesso'
            }
        });
    }

//LOGAR E DESLOGAR !!!!!!

    static async logar(req: Request, res: Response) {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha todos os campos corretamente',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const usuario = await Usuario.buscarPorEmailESenha(email, senha);

        if (!usuario) {
            return res.render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'E-mail ou senha incorretos',
                    titulo: 'Dados inválidos'
                }
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                console.error('Erro ao renovar a sessão após o login:', error);
                return res.status(500).render('login', {
                    mensagem: {
                        tipo: 'error',
                        valor: 'Não foi possível iniciar sua sessão. Tente novamente.',
                        titulo: 'Erro'
                    }
                });
            }

            (req.session as any).usuario = {
                nome: usuario.nome,
                email: usuario.email,
                id: usuario.id,
                tipo: usuario.tipoUsuario.nome,
                imagem: usuario.imagem
            };

            req.session.save((saveError) => {
                if (saveError) {
                    console.error('Erro ao salvar a sessão após o login:', saveError);
                    return res.status(500).render('login', {
                        mensagem: {
                            tipo: 'error',
                            valor: 'Não foi possível iniciar sua sessão. Tente novamente.',
                            titulo: 'Erro'
                        }
                    });
                }

                return res.redirect('/dashboard');
            });
        });
    }

    static async deslogar(req: Request, res: Response) {
        req.session.destroy(() => {
            res.redirect('/usuario/logar');
        });
    }

//ATUALIZAR E EDITAR !!!!!!

    static async atualizarPerfil(req: Request, res: Response) {
        const { usuario } = req.session as any;
        const { nome, email, senha } = req.body;
        const imagem = req.file?.filename;

        const usuarioEncontrado = await Usuario.buscarPorId(usuario.id);

        if (!usuarioEncontrado) {
            return res.redirect('/usuario/logar');
        }

        if (!nome || !email || !senha) {
            return res.render('pages/usuario/configuracaoPerfil', {
                usuario,
                usuarioPerfil: usuarioEncontrado,
                titulo: 'Configuração do Perfil',
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha todos os campos corretamente',
                    titulo: 'Dados inválidos'
                }
            });
        }

        if (imagem && usuarioEncontrado.imagem) {
            const imagemAntiga = path.join('uploads', usuarioEncontrado.imagem);
            fs.unlink(imagemAntiga, () => {});
        }

        usuarioEncontrado.nome = nome;
        usuarioEncontrado.email = email;
        usuarioEncontrado.senha = await bcrypt.hash(senha, 10);
        usuarioEncontrado.imagem = imagem || usuarioEncontrado.imagem;

        await Usuario.atualizarUsuario(usuarioEncontrado);

        Object.assign(usuario, {
            nome: usuarioEncontrado.nome,
            email: usuarioEncontrado.email,
            imagem: usuarioEncontrado.imagem
        });

        return res.render('pages/usuario/configuracaoPerfil', {
            usuario,
            usuarioPerfil: usuarioEncontrado,
            titulo: 'Configuração do Perfil',
            mensagem: {
                tipo: 'success',
                valor: 'Perfil atualizado com sucesso!',
                titulo: 'Sucesso'
            }
        });
    }

    static async editar(req: Request, res: Response) {
        const { id } = req.params;
        const { nome, email, tipo } = req.body;
        const usuarioLogado = (req.session as any)?.usuario;

        if (!UsuarioController.podeEditarUsuario(req, id)) {
            return res.redirect('/dashboard');
        }

        const usuarioEncontrado = await Usuario.buscarPorId(id);

        if(!usuarioEncontrado) {
            throw new Error('Usuário não encontrado');
        }

        const tipoSelecionado = usuarioLogado?.tipo === 'ADMIN'
            ? await TipoUsuario.buscarPorNome(tipo)
            : usuarioEncontrado.tipoUsuario;

        if (!tipoSelecionado) {
            return res.render('pages/usuario/editar', {
                titulo: 'Editar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: 'Tipo de usuário inválido',
                    titulo: 'Erro'
                },
                usuarioParaEditar: usuarioEncontrado,
            });
        }

        usuarioEncontrado.nome = nome;
        usuarioEncontrado.email = email;
        usuarioEncontrado.tipoUsuario = tipoSelecionado;

        await Usuario.atualizarComTipo(usuarioEncontrado);

        return res.render('pages/usuario/editar', {
            titulo: 'Editar Usuário',
            mensagem: {
                tipo: 'success',
                valor: 'Dados salvos com sucesso!',
                titulo: 'Dados do usuário'
            },
            usuarioParaEditar: usuarioEncontrado,
            usuario: usuarioLogado
        });

    }

//EXCLUIR !!!!!!

    static async excluir(req: Request, res: Response) {
        const { id } = req.params;
        await Usuario.deletarPorId(id);
        res.redirect('../listar');
    }
} 
