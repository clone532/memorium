import { Request, Response } from "express";
import fs from "fs";
import path from "path";
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
    static async deletarPublicacao(req: Request, res: Response) {
        const usuarioSessao = (req.session as any).usuario;
        const idPerfil = Number(req.params.id);
        const idPublicacao = Number(req.params.publicacaoId);

        if (!Number.isSafeInteger(idPerfil) || idPerfil <= 0
            || !Number.isSafeInteger(idPublicacao) || idPublicacao <= 0) {
            return res.status(404).send("Publicação não encontrada.");
        }

        const podeExcluir = usuarioSessao.tipo === "ADMIN"
            || Number(usuarioSessao.id) === idPerfil;
        if (!podeExcluir) {
            return res.status(403).send("Você não pode excluir esta publicação.");
        }

        const publicacao = await Biografia.buscarPorId(idPublicacao);
        if (!publicacao || Number(publicacao.fk_usuario) !== idPerfil) {
            return res.status(404).send("Publicação não encontrada.");
        }

        const excluida = await Biografia.deletarPorUsuario(idPublicacao, idPerfil);
        if (!excluida) {
            return res.status(404).send("Publicação não encontrada.");
        }

        if (excluida.anexo_url) {
            try {
                await fs.promises.unlink(path.resolve(process.cwd(), "uploads", excluida.anexo_url));
            } catch (error) {
                if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
                    console.error("Não foi possível remover o arquivo da publicação excluída:", error);
                }
            }
        }

        return res.redirect(`/perfilUsuario/perfil/${idPerfil}?aba=biografia#listaBiografia`);
    }

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

            if ((!conteudo && !arquivo) || conteudo.length > 2000) {
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
