import { Request, Response } from "express";
import { Comentario } from "../models/Comentario";
import { Mural } from "../models/Mural";
import { Usuario } from "../models/Usuario";

export class ComentarioController {
    static async deletarComentario(req: Request, res: Response) {
        const usuarioSessao = (req.session as any).usuario;
        const idPerfil = Number(req.params.id);
        const idComentario = Number(req.params.comentarioId);

        if (!Number.isSafeInteger(idPerfil) || idPerfil <= 0
            || !Number.isSafeInteger(idComentario) || idComentario <= 0) {
            return res.status(404).send("Comentário não encontrado.");
        }

        const comentario = await Comentario.buscarPorId(idComentario);
        if (!comentario) {
            return res.status(404).send("Comentário não encontrado.");
        }

        const mural = await Mural.buscarPorUsuario(idPerfil);
        if (!mural || Number(comentario.fk_mural) !== Number(mural.id)) {
            return res.status(404).send("Comentário não encontrado.");
        }

        const podeExcluir = usuarioSessao.tipo === "ADMIN"
            || Number(usuarioSessao.id) === idPerfil
            || Number(usuarioSessao.id) === Number(comentario.fk_usuario);
        if (!podeExcluir) {
            return res.status(403).send("Você não pode excluir este comentário.");
        }

        await Comentario.deletarPorId(idComentario);
        return res.redirect(`/perfilUsuario/perfil/${idPerfil}?aba=mural#mural`);
    }

    static async carregarComentarios(req: Request, res: Response) {
        const usuario = (req.session as any).usuario;
        return res.redirect(`/perfilUsuario/perfil/${usuario.id}#mural`);
    }

    static async criarComentario(req: Request, res: Response) {
        const usuarioSessao = (req.session as any).usuario;
        const idPerfil = req.params.id || String(usuarioSessao.id);
        const voltarAoMural = `/perfilUsuario/perfil/${encodeURIComponent(idPerfil)}?aba=mural&erro=comentario#mural`;
        const conteudo = typeof req.body.conteudo === "string" ? req.body.conteudo.trim() : "";

        if (!conteudo || conteudo.length > 500) {
            return res.redirect(voltarAoMural);
        }

        const idPerfilNumerico = Number(idPerfil);
        if (!Number.isSafeInteger(idPerfilNumerico) || idPerfilNumerico <= 0) {
            return res.status(404).send("Perfil não encontrado.");
        }

        const usuarioPerfil = await Usuario.buscarPorId(String(idPerfilNumerico));
        if (!usuarioPerfil?.id) {
            return res.status(404).send("Perfil não encontrado.");
        }

        const mural = await Mural.buscarOuCriarPorUsuario(usuarioPerfil.id);
        const comentario = new Comentario({
            dataHora: new Date(),
            conteudo,
            fkMural: mural.id,
            fkUsuario: Number(usuarioSessao.id)
        });

        await Comentario.criarComentario(comentario);

        return res.redirect(`/perfilUsuario/perfil/${encodeURIComponent(idPerfil)}?aba=mural#mural`);
    }
}