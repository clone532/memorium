import { Request, Response } from "express";
import { Guardiao } from "../models/Guardiao";

export class GuardiaoController {
    static async carregarCadastrar(req: Request, res: Response) {
        res.render('pages/guardiao/cadastrar', {
            mensagem: null,
            titulo: null
        });
    }

    static async cadastrarGuardiao(req: Request, res: Response) {
        const { nome, email, numero } = req.body;
    
            if (!nome || !email || !numero ) {
                return res.render('', {
                    mensagem: {
                        tipo: 'error',
                        valor: 'Preencha corretamente os dados!',
                        titulo: 'Dados inválidos'
                    }
                });
            }
    
            const guardiaoEncontrado = await Guardiao.buscarPorEmailENumero(email, numero);
    
            if (guardiaoEncontrado) {
                return res.render('login', {
                    mensagem: {
                        tipo: 'error',
                        valor: 'Guardião já existe, tente logar.',
                        titulo: 'Dados inválidos'
                    }
                });
            }
    
            const guardiao: Guardiao = new Guardiao({
                nome,
                email,
                numero
            });
    
            await Guardiao.cadastrarGuardiao(guardiao);
    
            res.render('login', {
                mensagem: {
                    tipo: 'success',
                    valor: 'Guardião cadastrado com sucesso',
                    titulo: 'Sucesso'
                }
            });
    }

}