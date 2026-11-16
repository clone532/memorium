import { Request, Response } from "express";
import fs from "fs";
import { Biografia } from "../models/Biografia";
import { Usuario } from "../models/Usuario";

async function removerArquivo(filePath: string) {
    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        console.error("Não foi possível remover o arquivo de uma publicação não salva:", error);
    }
}

export class BiografiaController {
    static async criarPublicacao(req: Request, res: Response) {
        const arquivo = req.file;

        try {
            const usuarioSessao = (req.session as any).usuario;
            const idPerfil = Number(req.params.id);
            const voltarAoPerfil = `/perfilUsuario/perfil/${idPerfil}?aba=biografia&erro=publicacao#listaBiografia`;
            const conteudo = typeof req.body.conteudo === "string" ? req.body.conteudo.trim() : "";

            if (!Number.isSafeInteger(idPerfil) || idPerfil <= 0) {
                if (arquivo) {
                    await removerArquivo(arquivo.path);
                }
                return res.status(404).send("Perfil não encontrado.");
            }

            if (Number(usuarioSessao.id) !== idPerfil) {
                if (arquivo) {
                    await removerArquivo(arquivo.path);
                }
                return res.status(403).send("Você só pode publicar na sua própria biografia.");
            }

            const usuario = await Usuario.buscarPorId(String(idPerfil));
            if (!usuario?.id) {
                if (arquivo) {
                    await removerArquivo(arquivo.path);
                }
                return res.status(404).send("Perfil não encontrado.");
            }

            if ((!conteudo && !arquivo) || conteudo.length > 5000) {
                if (arquivo) {
                    await removerArquivo(arquivo.path);
                }
                return res.redirect(voltarAoPerfil);
            }

            const publicacao = new Biografia({
                conteudo,
                anexoUrl: arquivo?.filename || null,
                tipoAnexo: arquivo?.mimetype || null,
                fkUsuario: usuario.id
            });

            await Biografia.criar(publicacao);

            return res.redirect(`/perfilUsuario/perfil/${idPerfil}?aba=biografia#listaBiografia`);
        } catch (error) {
            if (arquivo) {
                await removerArquivo(arquivo.path);
            }

            console.error("Falha ao salvar publicação da biografia:", error);
            return res.status(500).send("Não foi possível salvar a publicação.");
        }
    }
}
