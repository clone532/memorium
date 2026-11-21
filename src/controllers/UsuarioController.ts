import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { Request, Response } from "express";
import { Usuario } from "../models/Usuario";
import { TipoUsuario } from "../models/TipoUsuario";
import { TipoUsuarioEnum } from "../enums/TipoUsuario";
import { Comentario } from "../models/Comentario";
import { Mural } from "../models/Mural";
import { Biografia } from "../models/Biografia";
import { PRIVACIDADE_VERSAO, TERMOS_VERSAO } from "../constants/LegalDocuments";
import fs from "fs";
import path from "path";
import { transporter } from "../infra/mail/NodeMailer";

function isPostgresError(error: unknown, code: string, constraint?: string) {
    if (!error || typeof error !== "object") {
        return false;
    }

    const postgresError = error as { code?: string; constraint?: string };
    return postgresError.code === code
        && (!constraint || postgresError.constraint === constraint);
}

function isDuplicateEmailError(error: unknown) {
    return isPostgresError(error, "23505", "usuario_email_unico");
}

function validarDataNascimento(dataNasc: unknown) {
    if (typeof dataNasc !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dataNasc)) {
        return "Informe uma data de nascimento válida.";
    }

    const data = new Date(`${dataNasc}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dataNasc) {
        return "Informe uma data de nascimento válida.";
    }

    const hoje = new Date();
    const limiteSuperior = new Date(Date.UTC(
        hoje.getUTCFullYear(),
        hoje.getUTCMonth(),
        hoje.getUTCDate()
    ));

    if (data > limiteSuperior) {
        return "Informe uma data de nascimento que não seja futura.";
    }

    const idadeMinima = new Date(Date.UTC(
        hoje.getUTCFullYear() - 14,
        hoje.getUTCMonth(),
        hoje.getUTCDate()
    ));

    if (data > idadeMinima) {
        return "É necessário ter pelo menos 14 anos para criar uma conta.";
    }

    return null;
}

async function removerAvatar(filename?: string) {
    if (!filename) {
        return;
    }

    try {
        await fs.promises.unlink(path.resolve(process.cwd(), "uploads", filename));
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return;
        }

        console.error("Não foi possível remover o arquivo de avatar:", error);
    }
}

function hashCodigoRecuperacao(sessionId: string, codigo: string) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error("Defina SESSION_SECRET para validar códigos de recuperação.");
    }

    return createHmac("sha256", secret).update(`${sessionId}:${codigo}`).digest();
}

export class UsuarioController {
    static async enviarCodigoRecuperacao(req: Request, res: Response) {
        const email = typeof req.body.email === "string"
            ? Usuario.normalizarEmail(req.body.email)
            : "";
        const sessao = req.session as any;
        delete sessao.recuperacaoSenha;

        if (!email) {
            return res.status(400).json({ erro: "Informe um e-mail válido." });
        }

        const usuario = await Usuario.buscarPorEmail(email);
        if (usuario?.id) {
            const codigo = randomInt(0, 1_000_000).toString().padStart(6, "0");
            sessao.recuperacaoSenha = {
                usuarioId: usuario.id,
                codigoHash: hashCodigoRecuperacao(req.sessionID, codigo).toString("hex"),
                expiraEm: Date.now() + 10 * 60 * 1000,
                tentativas: 0
            };

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: usuario.email,
                    subject: "Código de recuperação de senha - Memorium",
                    text: `Seu código de recuperação é ${codigo}. Ele expira em 10 minutos.`,
                    html: `<p>Seu código de recuperação de senha é:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${codigo}</p><p>Ele expira em 10 minutos. Se você não solicitou esta alteração, ignore este e-mail.</p>`
                });
            } catch (error) {
                delete sessao.recuperacaoSenha;
                console.error("Erro ao enviar código de recuperação de senha:", error);
                return res.status(500).json({ erro: "Não foi possível enviar o código. Tente novamente." });
            }
        }

        return res.json({
            mensagem: "Se o e-mail estiver cadastrado, enviaremos um código de recuperação."
        });
    }

    static async redefinirSenha(req: Request, res: Response) {
        const codigo = typeof req.body.codigo === "string" ? req.body.codigo.trim() : "";
        const senha = typeof req.body.senha === "string" ? req.body.senha : "";
        const sessao = req.session as any;
        const recuperacao = sessao.recuperacaoSenha;

        if (senha.length < 8) {
            return res.status(400).json({ erro: "A nova senha deve ter pelo menos 8 caracteres." });
        }

        if (!recuperacao || Date.now() > recuperacao.expiraEm || recuperacao.tentativas >= 5) {
            delete sessao.recuperacaoSenha;
            return res.status(400).json({ erro: "Código inválido ou expirado. Solicite um novo código." });
        }

        const codigoHash = hashCodigoRecuperacao(req.sessionID, codigo);
        const codigoHashEsperado = Buffer.from(recuperacao.codigoHash, "hex");
        recuperacao.tentativas += 1;
        if (
            !/^\d{6}$/.test(codigo)
            || codigoHash.length !== codigoHashEsperado.length
            || !timingSafeEqual(codigoHash, codigoHashEsperado)
        ) {
            if (recuperacao.tentativas >= 5) {
                delete sessao.recuperacaoSenha;
            }
            return res.status(400).json({ erro: "Código inválido ou expirado. Solicite um novo código." });
        }

        await Usuario.atualizarSenha(recuperacao.usuarioId, senha);
        delete sessao.recuperacaoSenha;
        return res.json({ mensagem: "Senha redefinida com sucesso." });
    }

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
        return res.render('login', {
            loginEmail: '',
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

    static async carregarAceiteDocumentos(req: Request, res: Response) {
        const usuarioSessao = (req.session as any).usuario;
        const usuarioEncontrado = await Usuario.buscarPorId(String(usuarioSessao.id));

        if (!usuarioEncontrado) {
            return res.redirect('/usuario/logar');
        }

        return res.render('legal/aceitarDocumentos', {
            usuario: usuarioSessao,
            termosVersao: TERMOS_VERSAO,
            privacidadeVersao: PRIVACIDADE_VERSAO,
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
        const { nome, email, senha, dataNasc, tipo } = req.body;
        const emailNormalizado = typeof email === "string" ? Usuario.normalizarEmail(email) : "";

        if (!nome || !emailNormalizado || !senha || !dataNasc) {
            return res.status(400).render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha corretamente os dados!',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const erroDataNascimento = validarDataNascimento(dataNasc);
        if (erroDataNascimento) {
            return res.status(400).render('login', {
                loginEmail: emailNormalizado,
                cadastroAtivo: true,
                mensagem: {
                    tipo: 'error',
                    valor: erroDataNascimento,
                    titulo: 'Data de nascimento inválida'
                }
            });
        }

        if (req.body.aceitaTermos !== "on" || req.body.leuPrivacidade !== "on") {
            return res.status(400).render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Aceite os Termos de Uso e confirme a leitura do Aviso de Privacidade para concluir o cadastro.',
                    titulo: 'Documentos obrigatórios'
                }
            });
        }

        const usuarioEncontrado = await Usuario.buscarPorEmail(emailNormalizado);

        if (usuarioEncontrado) {
            return res.status(409).render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'E-mail já existe',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const tipoSolicitado = typeof tipo === "string" ? tipo : TipoUsuarioEnum.USUARIO;
        if (tipoSolicitado !== TipoUsuarioEnum.USUARIO) {
            return res.status(400).render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Selecione um tipo de conta válido.',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const tipoConta = await TipoUsuario.buscarPorNome(tipoSolicitado);
        if (!tipoConta) {
            return res.render('login', {
                mensagem: {
                    tipo: 'error',
                    valor: 'Tipo de conta não encontrado',
                    titulo: 'Erro do sistema'
                }
            });
        }

        const usuario: Usuario = new Usuario({
            nome,
            email: emailNormalizado,
            senha,
            dataNasc,
            estaMorto: false,
            numero: '',
            tipoUsuario: tipoConta,
            termosVersaoAceita: TERMOS_VERSAO,
            privacidadeVersaoLida: PRIVACIDADE_VERSAO
        });

        try {
            await Usuario.cadastrarUsuario(usuario);
        } catch (error) {
            if (isDuplicateEmailError(error)) {
                return res.status(409).render('login', {
                    mensagem: {
                        tipo: 'error',
                        valor: 'E-mail já cadastrado. Use outro endereço.',
                        titulo: 'E-mail já existe'
                    }
                });
            }

            throw error;
        }

        return res.render('login', {
            mensagem: {
                tipo: 'success',
                valor: 'Usuário cadastrado com sucesso',
                titulo: 'Sucesso'
            }
        });
    }

    static async cadUsuarioPorAdmin(req: Request, res: Response) {
        const { nome, email, senha, dataNasc, tipo } = req.body;
        const emailNormalizado = typeof email === "string" ? Usuario.normalizarEmail(email) : "";

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

        if (!nome || !emailNormalizado || !senha || !dataNasc) {
            return res.status(400).render('pages/usuario/cadAdmin', {
                titulo: 'Cadastrar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha todos os campos corretamente.',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const erroDataNascimento = validarDataNascimento(dataNasc);
        if (erroDataNascimento) {
            return res.status(400).render('pages/usuario/cadAdmin', {
                titulo: 'Cadastrar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: erroDataNascimento,
                    titulo: 'Data de nascimento inválida'
                }
            });
        }

        const usuarioEncontrado = await Usuario.buscarPorEmail(emailNormalizado);

        if (usuarioEncontrado) {
            return res.status(409).render('pages/usuario/cadAdmin', {
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
            email: emailNormalizado,
            senha,
            dataNasc,
            estaMorto: false,
            numero: '',
            tipoUsuario
        });

        try {
            await Usuario.cadastrarUsuario(novoUsuario);
        } catch (error) {
            if (isDuplicateEmailError(error)) {
                return res.status(409).render('pages/usuario/cadAdmin', {
                    titulo: 'Cadastrar Usuário',
                    mensagem: {
                        tipo: 'error',
                        valor: 'E-mail já cadastrado. Use outro endereço.',
                        titulo: 'E-mail já existe'
                    }
                });
            }

            throw error;
        }

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
        const loginEmail = typeof email === "string" ? email.trim() : "";

        if (typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha) {
            return res.status(400).render('login', {
                loginEmail,
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha todos os campos corretamente',
                    titulo: 'Dados inválidos'
                }
            });
        }

        const usuario = await Usuario.buscarPorEmailESenha(email, senha);

        if (!usuario) {
            return res.status(401).render('login', {
                loginEmail,
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
                    loginEmail,
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
                imagem: usuario.imagem,
                termosVersaoAceita: usuario.termosVersaoAceita,
                privacidadeVersaoLida: usuario.privacidadeVersaoLida
            };

            req.session.save((saveError) => {
                if (saveError) {
                    console.error('Erro ao salvar a sessão após o login:', saveError);
                    return res.status(500).render('login', {
                        loginEmail,
                        mensagem: {
                            tipo: 'error',
                            valor: 'Não foi possível iniciar sua sessão. Tente novamente.',
                            titulo: 'Erro'
                        }
                    });
                }

                const documentosAtualizados = usuario.termosVersaoAceita === TERMOS_VERSAO
                    && usuario.privacidadeVersaoLida === PRIVACIDADE_VERSAO;
                return res.redirect(documentosAtualizados ? '/dashboard' : '/usuario/aceitar-documentos');
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
        const emailNormalizado = typeof email === "string" ? Usuario.normalizarEmail(email) : "";
        let imagemSalva = false;

        try {
            const usuarioEncontrado = await Usuario.buscarPorId(usuario.id);

            if (!usuarioEncontrado) {
                return res.redirect('/usuario/logar');
            }

            if (
                typeof nome !== 'string' || !nome || nome.length > 100
                || typeof email !== 'string' || !emailNormalizado || email.length > 150
                || (typeof senha === 'string' && senha.length > 25)
            ) {
                return res.status(400).render('pages/usuario/configuracaoPerfil', {
                    usuario,
                    usuarioPerfil: usuarioEncontrado,
                    titulo: 'Configuração do Perfil',
                    mensagem: {
                        tipo: 'error',
                        valor: 'Confira os dados: nome até 100, e-mail até 150 e senha até 25 caracteres.',
                        titulo: 'Dados inválidos'
                    }
                });
            }

            const emailMudou = emailNormalizado !== Usuario.normalizarEmail(usuarioEncontrado.email);
            const emailExistente = emailMudou
                ? await Usuario.buscarPorEmail(emailNormalizado, usuarioEncontrado.id)
                : null;
            if (emailExistente) {
                return res.status(409).render('pages/usuario/configuracaoPerfil', {
                    usuario,
                    usuarioPerfil: usuarioEncontrado,
                    titulo: 'Configuração do Perfil',
                    mensagem: {
                        tipo: 'error',
                        valor: 'Esse e-mail já está sendo usado por outra conta.',
                        titulo: 'E-mail já existe'
                    }
                });
            }

            const imagemAntiga = usuarioEncontrado.imagem;
            usuarioEncontrado.nome = nome;
            usuarioEncontrado.email = emailNormalizado;
            if (typeof senha === 'string' && senha.length > 0) {
                usuarioEncontrado.senha = await bcrypt.hash(senha, 10);
            }
            usuarioEncontrado.imagem = imagem || usuarioEncontrado.imagem;

            try {
                await Usuario.atualizarUsuario(usuarioEncontrado);
            } catch (error) {
                if (isDuplicateEmailError(error)) {
                    return res.status(409).render('pages/usuario/configuracaoPerfil', {
                        usuario,
                        usuarioPerfil: usuarioEncontrado,
                        titulo: 'Configuração do Perfil',
                        mensagem: {
                            tipo: 'error',
                            valor: 'Esse e-mail já está sendo usado por outra conta.',
                            titulo: 'E-mail já existe'
                        }
                    });
                }

                throw error;
            }

            imagemSalva = Boolean(imagem);
            Object.assign(usuario, {
                nome: usuarioEncontrado.nome,
                email: usuarioEncontrado.email,
                imagem: usuarioEncontrado.imagem
            });

            if (imagem && imagemAntiga && imagemAntiga !== imagem) {
                await removerAvatar(imagemAntiga);
            }

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
        } finally {
            if (imagem && !imagemSalva) {
                await removerAvatar(imagem);
            }
        }
    }

    static async editar(req: Request, res: Response) {
        const { id } = req.params;
        const { nome, email, tipo } = req.body;
        const emailNormalizado = typeof email === "string" ? Usuario.normalizarEmail(email) : "";
        const usuarioLogado = (req.session as any)?.usuario;

        if (!UsuarioController.podeEditarUsuario(req, id)) {
            return res.redirect('/dashboard');
        }

        const usuarioEncontrado = await Usuario.buscarPorId(id);

        if(!usuarioEncontrado) {
            throw new Error('Usuário não encontrado');
        }

        if (!nome || !emailNormalizado) {
            return res.status(400).render('pages/usuario/editar', {
                titulo: 'Editar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha nome e e-mail corretamente.',
                    titulo: 'Dados inválidos'
                },
                usuarioParaEditar: usuarioEncontrado,
                usuario: usuarioLogado
            });
        }

        const emailMudou = emailNormalizado !== Usuario.normalizarEmail(usuarioEncontrado.email);
        const emailExistente = emailMudou
            ? await Usuario.buscarPorEmail(emailNormalizado, Number(id))
            : null;
        if (emailExistente) {
            return res.status(409).render('pages/usuario/editar', {
                titulo: 'Editar Usuário',
                mensagem: {
                    tipo: 'error',
                    valor: 'Esse e-mail já está sendo usado por outra conta.',
                    titulo: 'E-mail já existe'
                },
                usuarioParaEditar: usuarioEncontrado,
                usuario: usuarioLogado
            });
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
        usuarioEncontrado.email = emailNormalizado;
        usuarioEncontrado.tipoUsuario = tipoSelecionado;

        try {
            await Usuario.atualizarComTipo(usuarioEncontrado);
        } catch (error) {
            if (isDuplicateEmailError(error)) {
                return res.status(409).render('pages/usuario/editar', {
                    titulo: 'Editar Usuário',
                    mensagem: {
                        tipo: 'error',
                        valor: 'Esse e-mail já está sendo usado por outra conta.',
                        titulo: 'E-mail já existe'
                    },
                    usuarioParaEditar: usuarioEncontrado,
                    usuario: usuarioLogado
                });
            }

            throw error;
        }

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
        try {
            await Usuario.deletarPorId(id);
            return res.redirect('/usuario/listar');
        } catch (error) {
            if (!isPostgresError(error, "23503")) {
                throw error;
            }

            const usuario = (req.session as any).usuario;
            const usuarios = await Usuario.buscarTodos();
            return res.status(409).render('pages/usuario/listar', {
                usuario,
                usuarios,
                titulo: 'Listar Usuários',
                mensagem: {
                    tipo: 'error',
                    valor: 'Não foi possível excluir este usuário porque ele ainda possui dados relacionados. Nenhum dado foi apagado.',
                    titulo: 'Usuário possui registros vinculados'
                }
            });
        }
    }
} 
