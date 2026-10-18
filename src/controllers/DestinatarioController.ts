import { Request, Response } from "express";
import { Destinatario } from "../models/Destinatario";

export class DestinatarioController {

    static async carregarCadastrarListar(req: Request, res: Response) {
        const { destinatario } = req.session as any;

        const destinatarios = await Destinatario.buscarTodos();

        res.render('pages/destinatario/cadastrarListar', {
            destinatario,
            destinatarios,
            mensagem: null
        });
    }

    static carregarCadastrar(req: Request, res: Response) {
        const { destinatario } = req.session as any;

        return res.render('pages/destinatario/cadastrar', {
            destinatario,
            destinatarioParaEditar: null,
            destinatarioForm: { nome: '', email: '', numero: '' },
            mensagem: null
        });
    }

    static async cadastrar(req: Request, res: Response) {
        const { nome, email, numero } = req.body;
        const { destinatario } = req.session as any;

        if (!nome || !email || !numero ) {
            return res.render('pages/destinatario/cadastrar', {
                destinatario,
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

        await Destinatario.cadastrarDestinatario(novoDestinatario);
        
        const destinatarios = await Destinatario.buscarTodos();

        res.render('pages/destinatario/cadastrarListar', {
            destinatario,
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
        const { destinatario } = req.session as any;

        await Destinatario.deletarDestinatario(id);
        
        const destinatarios = await Destinatario.buscarTodos();

        res.render('pages/destinatario/cadastrarListar', {
            destinatario,
            destinatarios,
            mensagem: {
                tipo: 'success',
                valor: 'Destinatário excluído com sucesso',
                titulo: 'Sucesso'
            }
        });
    }

    static carregarEditar(req: Request, res: Response) {
        return res.redirect('/destinatario/cadastrarListar');
    }

    static async carregarCadastrarListarComEdicao(req: Request, res: Response) {
        const { id } = req.params;
        const { destinatario } = req.session as any;

        const destinatarioEncontrado = await Destinatario.buscarPorId(id);

        if (!destinatarioEncontrado) {
            return res.redirect('/destinatario/cadastrarListar');
        }

        return res.render('pages/destinatario/cadastrar', {
            destinatario,
            destinatarioParaEditar: destinatarioEncontrado,
            destinatarioForm: destinatarioEncontrado,
            mensagem: null
        });
    }

    static async editar(req: Request, res: Response) {
        const { id } = req.params;
        const { nome, email, numero } = req.body;
        const { destinatario } = req.session as any;
        const destinatarioEncontrado = await Destinatario.buscarPorId(id);

        if (!destinatarioEncontrado) {
            return res.redirect('/destinatario/cadastrarListar');
        }

        destinatarioEncontrado.nome = nome;
        destinatarioEncontrado.email = email;
        destinatarioEncontrado.numero = numero;

        await Destinatario.atualizarDestinatario(destinatarioEncontrado);

        const destinatarios = await Destinatario.buscarTodos();

        return res.render('pages/destinatario/cadastrarListar', {
            destinatario,
            destinatarios,
            mensagem: {
                tipo: 'success',
                valor: 'Destinatário atualizado com sucesso!',
                titulo: 'Sucesso'
            }
        });
    }
}