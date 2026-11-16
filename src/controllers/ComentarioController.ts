import { Request, Response } from "express";
import { Comentario } from "../models/Comentario";
import { Mural } from "../models/Mural";
import { Usuario } from "../models/Usuario";

export class ComentarioController {
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