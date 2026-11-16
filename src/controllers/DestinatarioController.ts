import { Request, Response } from "express";
import { Destinatario } from "../models/Destinatario";

export class DestinatarioController {

    static async carregarCadastrarListar(req: Request, res: Response) {
        const { usuario } = req.session as any;

        const destinatarios = await Destinatario.buscarTodos(usuario.id);

        res.render('pages/destinatario/cadastrarListar', {
            usuario,
            destinatarios,
            mensagem: null
        });
    }

    static carregarCadastrar(req: Request, res: Response) {
        const { usuario } = req.session as any;

        return res.render('pages/destinatario/cadastrar', {
            usuario,
            destinatarioParaEditar: null,
            destinatarioForm: { nome: '', email: '', numero: '' },
            mensagem: null
        });
    }

    static async cadastrar(req: Request, res: Response) {
        const { nome, email, numero } = req.body;
        const { usuario } = req.session as any;

        if (!nome || !email || !numero ) {
            return res.status(400).render('pages/destinatario/cadastrar', {
                usuario,
                destinatarioParaEditar: null,
                destinatarioForm: { nome, email, numero },
                mensagem: {
                    tipo: 'error',
                    valor: 'Preencha todos os campos',
                    titulo: 'Dados inválidos'
                }
            });
        }

        /* !! DÚVIDA SOBRE DESTINATARIOS EXISTENTES !!
                    SE ESSA VERIFICAÇÃO FOR VERDADE, PODE SER QUE O USUÁRIO NÃO CONSIGA CADASTRAR UM DESTINATÁRIO SE
                    OUTRO USUÁRIO JÁ TIVER FEITO. O RESULTADO SERIA QUE O USUÁRIO NÃO IRIA CONSEGUIR CADASTRAR O
                    DESTINATÁRIO DESEJADO 
        
         const destinatarioEncontrado = await Destinatario.buscarPorEmail(email);

         if (destinatarioEncontrado) {
             return res.render('pages/destinatario/cadastrarListar', {
                 mensagem: {
                     tipo: 'error',
                     valor: 'Destinatario já existe',
                     titulo: 'Dados inválidos'
                 }
             });
         }*/

        const novoDestinatario: Destinatario = new Destinatario({
            nome,
            email,
            numero
        });

        await Destinatario.cadastrarDestinatario(novoDestinatario, usuario.id);
        
        const destinatarios = await Destinatario.buscarTodos(usuario.id);

        res.render('pages/destinatario/cadastrarListar', {
            usuario,
            destinatarios,
            mensagem: {
                tipo: 'success',
                valor: 'Destinatário cadastrado com sucesso',
                titulo: 'Sucesso'
            }
        });
    }

    static async excluir(req: Request, res: Response) {
        const { id } = req.params;
        const { usuario } = req.session as any;

        const removido = await Destinatario.deletarDestinatario(id, usuario.id);
        
        const destinatarios = await Destinatario.buscarTodos(usuario.id);

        return res.status(removido ? 200 : 404).render('pages/destinatario/cadastrarListar', {
            usuario,
            destinatarios,
            mensagem: {
                tipo: removido ? 'success' : 'error',
                valor: removido ? 'Destinatário excluído com sucesso' : 'Destinatário não encontrado.',
                titulo: removido ? 'Sucesso' : 'Não encontrado'
            }
        });
    }

    static carregarEditar(req: Request, res: Response) {
        return res.redirect('/destinatario/cadastrarListar');
    }

    static async carregarCadastrarListarComEdicao(req: Request, res: Response) {
        const { id } = req.params;
        const { usuario } = req.session as any;

        const destinatarioEncontrado = await Destinatario.buscarPorId(id, usuario.id);

        if (!destinatarioEncontrado) {
            return res.redirect('/destinatario/cadastrarListar');
        }

        return res.render('pages/destinatario/cadastrar', {
            usuario,
            destinatarioParaEditar: destinatarioEncontrado,
            destinatarioForm: destinatarioEncontrado,
            mensagem: null
        });
    }

    static async editar(req: Request, res: Response) {
        const { id } = req.params;
        const { nome, email, numero } = req.body;
        const { usuario } = req.session as any;
        const destinatarioEncontrado = await Destinatario.buscarPorId(id, usuario.id);

        if (!destinatarioEncontrado) {
            return res.redirect('/destinatario/cadastrarListar');
        }

        destinatarioEncontrado.nome = nome;
        destinatarioEncontrado.email = email;
        destinatarioEncontrado.numero = numero;

        const atualizado = await Destinatario.atualizarDestinatario(destinatarioEncontrado, usuario.id);

        const destinatarios = await Destinatario.buscarTodos(usuario.id);

        return res.status(atualizado ? 200 : 404).render('pages/destinatario/cadastrarListar', {
            usuario,
            destinatarios,
            mensagem: {
                tipo: atualizado ? 'success' : 'error',
                valor: atualizado ? 'Destinatário atualizado com sucesso!' : 'Destinatário não encontrado.',
                titulo: atualizado ? 'Sucesso' : 'Não encontrado'
            }
        });
    }
}