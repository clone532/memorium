import fs from "fs/promises";
import path from "path";
import { PoolClient } from "pg";
import { connection } from "../Connection";
import { transporter } from "./NodeMailer";

const privateMessageDirectory = path.resolve(process.cwd(), "private-uploads", "messages");
const retryLimit = 8;
const leaseMinutes = 30;

type DestinatarioFila = {
    id: number;
    email: string;
};

type AnexoFila = {
    nome_original: string;
    caminho_privado: string;
    tipo_mime: string;
};

type MensagemFila = {
    id: number;
    titulo: string;
    conteudo: string;
    destinatario_id: number;
    email: string;
    anexos: AnexoFila[];
};

async function recuperarEnviosInterrompidos(client: PoolClient) {
    await client.query(
        `UPDATE destinatario_mensagem
         SET status_envio = 'falha',
             proxima_tentativa_em = CASE WHEN tentativas < $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
             ultimo_erro = 'Envio interrompido antes da confirmação do SMTP.'
         WHERE status_envio = 'enviando'
           AND proxima_tentativa_em <= CURRENT_TIMESTAMP`,
        [retryLimit]
    );

    await client.query(
        `UPDATE mensagem m
         SET status = CASE
             WHEN EXISTS (
                 SELECT 1 FROM destinatario_mensagem dm
                 WHERE dm.fkmensagem = m.id AND dm.status_envio = 'enviado'
             ) THEN 'parcialmente_enviada'
             ELSE 'falha'
         END
         WHERE m.status = 'enviando'
           AND NOT EXISTS (
               SELECT 1 FROM destinatario_mensagem dm
               WHERE dm.fkmensagem = m.id AND dm.status_envio = 'enviando'
           )`
    );
}

async function reservarMensagem(client: PoolClient): Promise<MensagemFila | null> {
    await client.query("BEGIN");
    try {
        await recuperarEnviosInterrompidos(client);
        const candidate = await client.query(
            `SELECT m.id
             FROM mensagem m
             WHERE m.status IN ('agendada', 'pronta_para_envio', 'parcialmente_enviada', 'falha')
               AND (
                   m.status = 'pronta_para_envio'
                   OR (
                       m.data_envio IS NULL
                       AND m.status IN ('parcialmente_enviada', 'falha')
                   )
                   OR m.data_envio <= CURRENT_TIMESTAMP
               )
               AND EXISTS (
                   SELECT 1
                   FROM destinatario_mensagem dm
                   WHERE dm.fkmensagem = m.id
                     AND dm.status_envio IN ('pendente', 'falha')
                     AND dm.tentativas < $1
                     AND (dm.proxima_tentativa_em IS NULL
                          OR dm.proxima_tentativa_em <= CURRENT_TIMESTAMP)
               )
             ORDER BY COALESCE(m.data_envio, m.criado_em), m.id
             FOR UPDATE OF m SKIP LOCKED
             LIMIT 1`,
            [retryLimit]
        );

        if (!candidate.rows[0]) {
            await client.query("COMMIT");
            return null;
        }

        const idMensagem = candidate.rows[0].id as number;
        const mensagem = await client.query(
            `SELECT id, titulo, conteudo
             FROM mensagem
             WHERE id = $1`,
            [idMensagem]
        );
        const destinatario = await client.query(
            `WITH selecionado AS (
                 SELECT id
                 FROM destinatario_mensagem
                 WHERE fkmensagem = $1
                   AND status_envio IN ('pendente', 'falha')
                   AND tentativas < $2
                   AND (proxima_tentativa_em IS NULL
                        OR proxima_tentativa_em <= CURRENT_TIMESTAMP)
                 ORDER BY id
                 FOR UPDATE SKIP LOCKED
                 LIMIT 1
             )
             UPDATE destinatario_mensagem dm
             SET status_envio = 'enviando',
                 tentativas = dm.tentativas + 1,
                 proxima_tentativa_em = CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute')
             FROM selecionado
             WHERE dm.id = selecionado.id
             RETURNING dm.id, dm.fkdestinatario`,
            [idMensagem, retryLimit, leaseMinutes]
        );

        if (!destinatario.rows[0]) {
            await client.query("COMMIT");
            return null;
        }

        const contato = await client.query(
            `SELECT email FROM destinatario WHERE id = $1`,
            [destinatario.rows[0].fkdestinatario]
        );
        const anexos = await client.query(
            `SELECT nome_original, caminho_privado, tipo_mime
             FROM anexo_mensagem
             WHERE fkmensagem = $1
             ORDER BY id`,
            [idMensagem]
        );
        await client.query(
            `UPDATE mensagem
             SET status = 'enviando', tentativas_envio = tentativas_envio + 1
             WHERE id = $1`,
            [idMensagem]
        );
        await client.query("COMMIT");

        return {
            id: idMensagem,
            titulo: mensagem.rows[0].titulo,
            conteudo: mensagem.rows[0].conteudo,
            destinatario_id: destinatario.rows[0].id,
            email: contato.rows[0].email,
            anexos: anexos.rows
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

async function finalizarEntrega(
    client: PoolClient,
    entrega: MensagemFila,
    erro?: unknown
) {
    await client.query("BEGIN");
    try {
        if (erro === undefined) {
            await client.query(
                `UPDATE destinatario_mensagem
                 SET status_envio = 'enviado',
                     enviado_em = CURRENT_TIMESTAMP,
                     proxima_tentativa_em = NULL,
                     ultimo_erro = NULL
                 WHERE id = $1 AND status_envio = 'enviando'`,
                [entrega.destinatario_id]
            );
        } else {
            const detalhe = erro instanceof Error ? erro.message : String(erro);
            await client.query(
                `UPDATE destinatario_mensagem
                 SET status_envio = 'falha',
                     proxima_tentativa_em = CASE
                         WHEN tentativas < $2 THEN CURRENT_TIMESTAMP + (
                             LEAST(POWER(2, GREATEST(tentativas - 1, 0)) * 60, 86400)
                             * INTERVAL '1 second'
                         )
                         ELSE NULL
                     END,
                     ultimo_erro = $3
                 WHERE id = $1 AND status_envio = 'enviando'`,
                [entrega.destinatario_id, retryLimit, detalhe.slice(0, 1000)]
            );
        }

        const messageStatus = await client.query(
            `SELECT
                COUNT(*) FILTER (WHERE status_envio = 'enviado')::int AS enviados,
                COUNT(*) FILTER (WHERE status_envio IN ('pendente', 'enviando'))::int AS ativos,
                COUNT(*) FILTER (WHERE status_envio = 'falha' AND tentativas < $2)::int AS retentaveis,
                COUNT(*) FILTER (WHERE status_envio = 'falha' AND tentativas >= $2)::int AS falhas_permanentes
             FROM destinatario_mensagem
             WHERE fkmensagem = $1`,
            [entrega.id, retryLimit]
        );
        const counts = messageStatus.rows[0];
        const status = counts.ativos > 0 || counts.retentaveis > 0 || counts.falhas_permanentes > 0
            ? counts.enviados > 0 ? 'parcialmente_enviada' : 'falha'
            : counts.enviados > 0 ? 'enviada' : 'falha';

        await client.query(
            `UPDATE mensagem
             SET status = $2::varchar,
                 enviado_em = CASE WHEN $2::varchar = 'enviada' THEN CURRENT_TIMESTAMP ELSE enviado_em END,
                 proxima_tentativa_em = NULL,
                 ultimo_erro = CASE WHEN $2::varchar = 'falha' THEN $3::text ELSE NULL END
             WHERE id = $1`,
            [entrega.id, status, erro instanceof Error ? erro.message.slice(0, 1000) : null]
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

async function enviarMensagem(entrega: MensagemFila) {
    if (!process.env.EMAIL_USER) {
        throw new Error("EMAIL_USER não está configurado.");
    }

    const attachments = await Promise.all(entrega.anexos.map(async (anexo) => {
        const filename = path.basename(anexo.caminho_privado);
        const filePath = path.resolve(privateMessageDirectory, filename);
        await fs.access(filePath);
        return {
            filename: anexo.nome_original,
            path: filePath,
            contentType: anexo.tipo_mime
        };
    }));

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: entrega.email,
        subject: entrega.titulo,
        text: entrega.conteudo || "Esta mensagem contém arquivos anexados.",
        attachments
    });
}

export async function processarFilaMensagens() {
    const client = await connection.connect();
    try {
        let processadas = 0;
        while (true) {
            const entrega = await reservarMensagem(client);
            if (!entrega) {
                return processadas;
            }

            try {
                await enviarMensagem(entrega);
                await finalizarEntrega(client, entrega);
            } catch (error) {
                console.error(`Falha ao enviar mensagem ${entrega.id} para ${entrega.email}:`, error);
                await finalizarEntrega(client, entrega, error);
            }
            processadas++;
        }
    } finally {
        client.release();
    }
}

export function iniciarWorkerMensagens() {
    let executando = false;
    const executar = async () => {
        if (executando) {
            return;
        }
        executando = true;
        try {
            const count = await processarFilaMensagens();
            if (count > 0) {
                console.log(`Worker de mensagens processou ${count} entrega(s).`);
            }
        } catch (error) {
            console.error("Erro no worker de envio de mensagens:", error);
        } finally {
            executando = false;
        }
    };

    void executar();
    return setInterval(() => void executar(), 15_000);
}
