import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { Mensagem } from "../models/Mensagem";
import { Destinatario } from "../models/Destinatario";

const privateMessageDirectory = path.resolve(process.cwd(), "private-uploads", "messages");

export class MensagemController {
    static async carregarGerenciar(req: Request, res: Response) {
        return res.render('pages/mensagem/gerenciar', { mensagem: null });
    }

    static async listar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const mensagens = await Mensagem.listarDoUsuario(Number(usuario.id));
        return res.json({ mensagens });
    }

    static async carregarListar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const mensagens = await Mensagem.listarDoUsuario(Number(usuario.id));
        return res.render('pages/mensagem/listar', { mensagens });
    }

    static async criar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const { titulo, conteudo } = req.body;
        const rawDataEnvio = req.body.dataDeEnvio ?? req.body.dataEnvio;
        const files = (req.files as Express.Multer.File[] | undefined) || [];
        const isHtmlForm = req.path === '/mensagem/cadastrar';
        let destinatarios: number[];

        try {
            const entrada = req.body.destinatarios;
            destinatarios = (Array.isArray(entrada) ? entrada : [entrada])
                .map((id: unknown) => {
                    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
                        throw new Error('DESTINATARIO_INVALIDO');
                    }
                    return Number(id);
                });
        } catch {
            await this.removerAnexos(files);
            return this.responderErro(req, res, isHtmlForm, 400, 'Informe destinatários válidos.');
        }

        const data = rawDataEnvio === undefined || rawDataEnvio === '' ? null : new Date(rawDataEnvio);
        if (
            typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 255
            || typeof conteudo !== 'string' || conteudo.length > 20000
            || (!conteudo.trim() && files.length === 0)
            || destinatarios.length === 0
            || new Set(destinatarios).size !== destinatarios.length
            || (data !== null && Number.isNaN(data.getTime()))
        ) {
            await this.removerAnexos(files);
            return this.responderErro(req, res, isHtmlForm, 400, 'Informe um título, conteúdo ou arquivo, destinatários e uma data válida.');
        }

        try {
            const id = await Mensagem.criar({
                fkUsuario: Number(usuario.id),
                titulo: titulo.trim(),
                conteudo,
                dataEnvio: data,
                destinatarios,
                anexos: files.map((file) => ({
                    nomeOriginal: path.basename(file.originalname).slice(0, 255),
                    caminhoPrivado: file.filename,
                    tipoMime: file.mimetype,
                    tamanhoBytes: file.size
                }))
            });
            if (isHtmlForm) {
                return res.status(201).render('pages/mensagem/cadastrar', {
                    mensagem: { tipo: 'success', valor: 'Mensagem salva com sucesso.' },
                    mensagemForm: { titulo: '', conteudo: '', dataDeEnvio: '' },
                    destinatarios: await Destinatario.buscarTodos(Number(usuario.id))
                });
            }
            return res.status(201).json({ id, mensagem: 'Mensagem salva.' });
        } catch (error) {
            await this.removerAnexos(files);
            if (error instanceof Error && error.message === 'DESTINATARIO_INVALIDO') {
                return this.responderErro(req, res, isHtmlForm, 400, 'Um ou mais destinatários não pertencem à sua conta.');
            }
            if (isHtmlForm) {
                console.error('Falha ao salvar mensagem:', error);
                return this.responderErro(req, res, true, 500, 'Não foi possível salvar a mensagem. Tente novamente.');
            }
            throw error;
        }
    }

    private static async removerAnexos(files: Express.Multer.File[]) {
        await Promise.all(files.map(async (file) => {
            try {
                await fs.unlink(file.path);
            } catch (error) {
                const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
                if (code !== 'ENOENT') {
                    console.error('Não foi possível remover anexo não salvo:', error);
                }
            }
        }));
    }

    private static async responderErro(
        req: Request,
        res: Response,
        isHtmlForm: boolean,
        status: number,
        erro: string
    ) {
        if (!isHtmlForm) {
            return res.status(status).json({ erro });
        }
        const usuario = (req.session as any).usuario;
        return res.status(status).render('pages/mensagem/cadastrar', {
            mensagem: { tipo: 'error', valor: erro },
            mensagemForm: {
                titulo: typeof req.body.titulo === 'string' ? req.body.titulo : '',
                conteudo: typeof req.body.conteudo === 'string' ? req.body.conteudo : '',
                dataDeEnvio: typeof req.body.dataDeEnvio === 'string' ? req.body.dataDeEnvio : ''
            },
            destinatarios: await Destinatario.buscarTodos(Number(usuario.id))
        });
    }

    static async carregarCadastrar(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        const destinatarios = await Destinatario.buscarTodos(Number(usuario.id));

        return res.render('pages/mensagem/cadastrar', {
            mensagem: null,
            mensagemForm: { titulo: '', conteudo: '' },
            destinatarios
        });
    }
}