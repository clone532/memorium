const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const requiredVariables = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
    console.error(`Configure as variáveis de banco no .env: ${missingVariables.join(", ")}`);
    process.exit(1);
}

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number.parseInt(process.env.DB_PORT || "5432", 10)
});

async function ensureConstraint(client, table, name, definition) {
    const result = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = $2::regclass`,
        [name, table]
    );

    if (result.rowCount === 0) {
        await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} ${definition}`);
    }
}

async function migrateMessageSystem() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const duplicateAssociations = await client.query(`
            SELECT 1
            FROM destinatario_mensagem
            GROUP BY fkmensagem, fkdestinatario
            HAVING COUNT(*) > 1
            LIMIT 1
        `);

        if (duplicateAssociations.rowCount > 0) {
            throw new Error(
                "Há associações repetidas entre mensagens e destinatários. Resolva-as antes da migração; nenhum dado foi removido."
            );
        }

        await client.query(`
            ALTER TABLE destinatario
                ADD COLUMN IF NOT EXISTS fkusuario INTEGER REFERENCES usuario(id)
        `);
        await ensureConstraint(
            client,
            "destinatario",
            "destinatario_proprietario_obrigatorio",
            "CHECK (fkusuario IS NOT NULL) NOT VALID"
        );
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS destinatario_id_usuario_unico
            ON destinatario (id, fkusuario)
        `);

        await client.query(`
            ALTER TABLE mensagem
                ADD COLUMN IF NOT EXISTS fkusuario INTEGER REFERENCES usuario(id),
                ADD COLUMN IF NOT EXISTS conteudo TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS data_envio TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS tentativas_envio INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS proxima_tentativa_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS ultimo_erro TEXT,
                ADD COLUMN IF NOT EXISTS status VARCHAR(32)
        `);
        await client.query(`
            UPDATE mensagem
            SET status = 'legada'
            WHERE status IS NULL
        `);
        await client.query(`
            ALTER TABLE mensagem
                ALTER COLUMN status SET DEFAULT 'rascunho',
                ALTER COLUMN status SET NOT NULL,
                ALTER COLUMN anexourl DROP NOT NULL,
                ALTER COLUMN idtipomensagem DROP NOT NULL
        `);
        await ensureConstraint(
            client,
            "mensagem",
            "mensagem_proprietario_obrigatorio",
            "CHECK (fkusuario IS NOT NULL) NOT VALID"
        );
        await ensureConstraint(
            client,
            "mensagem",
            "mensagem_tentativas_nao_negativas",
            "CHECK (tentativas_envio >= 0)"
        );
        await ensureConstraint(
            client,
            "mensagem",
            "mensagem_status_valido",
            "CHECK (status IN ('rascunho', 'agendada', 'aguardando_confirmacao', 'pronta_para_envio', 'enviando', 'parcialmente_enviada', 'enviada', 'falha', 'cancelada', 'legada'))"
        );
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS mensagem_id_usuario_unico
            ON mensagem (id, fkusuario)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS mensagem_envio_agendado_idx
            ON mensagem (data_envio)
            WHERE status = 'agendada'
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS mensagem_fila_envio_idx
            ON mensagem (status, data_envio)
            WHERE status IN ('pronta_para_envio', 'parcialmente_enviada', 'falha')
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS anexo_mensagem (
                id SERIAL PRIMARY KEY,
                fkmensagem INTEGER NOT NULL REFERENCES mensagem(id) ON DELETE CASCADE,
                nome_original VARCHAR(255) NOT NULL,
                caminho_privado VARCHAR(512) NOT NULL,
                tipo_mime VARCHAR(100) NOT NULL,
                tamanho_bytes BIGINT NOT NULL
                    CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 15728640),
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE OR REPLACE FUNCTION validar_limite_total_anexos_mensagem()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS $$
            DECLARE
                total_existente BIGINT;
            BEGIN
                PERFORM 1 FROM mensagem WHERE id = NEW.fkmensagem FOR UPDATE;

                SELECT COALESCE(SUM(tamanho_bytes), 0)
                INTO total_existente
                FROM anexo_mensagem
                WHERE fkmensagem = NEW.fkmensagem
                  AND id IS DISTINCT FROM NEW.id;

                IF total_existente + NEW.tamanho_bytes > 15728640 THEN
                    RAISE EXCEPTION 'O conjunto de anexos da mensagem não pode exceder 15 MB.'
                        USING ERRCODE = '23514';
                END IF;

                RETURN NEW;
            END;
            $$
        `);
        await client.query(`
            DROP TRIGGER IF EXISTS anexo_mensagem_limite_total ON anexo_mensagem
        `);
        await client.query(`
            CREATE TRIGGER anexo_mensagem_limite_total
            BEFORE INSERT OR UPDATE OF fkmensagem, tamanho_bytes ON anexo_mensagem
            FOR EACH ROW
            EXECUTE PROCEDURE validar_limite_total_anexos_mensagem()
        `);

        await client.query(`
            ALTER TABLE destinatario_mensagem
                ADD COLUMN IF NOT EXISTS fkusuario INTEGER REFERENCES usuario(id),
                ADD COLUMN IF NOT EXISTS status_envio VARCHAR(24),
                ADD COLUMN IF NOT EXISTS tentativas INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS proxima_tentativa_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS ultimo_erro TEXT
        `);
        await client.query(`
            UPDATE destinatario_mensagem dm
            SET fkusuario = m.fkusuario
            FROM mensagem m, destinatario d
            WHERE dm.fkmensagem = m.id
              AND dm.fkdestinatario = d.id
              AND m.fkusuario IS NOT NULL
              AND m.fkusuario = d.fkusuario
              AND dm.fkusuario IS NULL
        `);
        await client.query(`
            UPDATE destinatario_mensagem
            SET status_envio = 'legada'
            WHERE status_envio IS NULL
        `);
        await client.query(`
            ALTER TABLE destinatario_mensagem
                ALTER COLUMN status_envio SET DEFAULT 'pendente',
                ALTER COLUMN status_envio SET NOT NULL
        `);
        await ensureConstraint(
            client,
            "destinatario_mensagem",
            "destinatario_mensagem_proprietario_obrigatorio",
            "CHECK (fkusuario IS NOT NULL) NOT VALID"
        );
        await ensureConstraint(
            client,
            "destinatario_mensagem",
            "destinatario_mensagem_status_valido",
            "CHECK (status_envio IN ('pendente', 'enviando', 'enviado', 'falha', 'cancelado', 'legada'))"
        );
        await ensureConstraint(
            client,
            "destinatario_mensagem",
            "destinatario_mensagem_tentativas_nao_negativas",
            "CHECK (tentativas >= 0)"
        );
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS destinatario_mensagem_par_unico
            ON destinatario_mensagem (fkmensagem, fkdestinatario)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS destinatario_mensagem_fila_idx
            ON destinatario_mensagem (fkmensagem, proxima_tentativa_em)
            WHERE status_envio IN ('pendente', 'falha', 'enviando')
        `);
        await ensureConstraint(
            client,
            "destinatario_mensagem",
            "destinatario_mensagem_mensagem_usuario_fk",
            "FOREIGN KEY (fkmensagem, fkusuario) REFERENCES mensagem(id, fkusuario) NOT VALID"
        );
        await ensureConstraint(
            client,
            "destinatario_mensagem",
            "destinatario_mensagem_destinatario_usuario_fk",
            "FOREIGN KEY (fkdestinatario, fkusuario) REFERENCES destinatario(id, fkusuario) NOT VALID"
        );

        await client.query(`
            ALTER TABLE usuario_guardiao
                ADD COLUMN IF NOT EXISTS votoconfirma BOOLEAN,
                ADD COLUMN IF NOT EXISTS estado_vinculo VARCHAR(20),
                ADD COLUMN IF NOT EXISTS token_vinculo_hash CHAR(64),
                ADD COLUMN IF NOT EXISTS token_vinculo_expira_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS convite_enviado_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS vinculo_confirmado_em TIMESTAMPTZ
        `);
        await client.query(`
            UPDATE usuario_guardiao
            SET votoconfirma = FALSE
            WHERE votoconfirma IS NULL
        `);
        await client.query(`
            ALTER TABLE usuario_guardiao
                ALTER COLUMN votoconfirma SET DEFAULT FALSE,
                ALTER COLUMN votoconfirma SET NOT NULL
        `);
        await client.query(`
            UPDATE usuario_guardiao
            SET estado_vinculo = 'pendente'
            WHERE estado_vinculo IS NULL
        `);
        await client.query(`
            ALTER TABLE usuario_guardiao
                ALTER COLUMN estado_vinculo SET DEFAULT 'pendente',
                ALTER COLUMN estado_vinculo SET NOT NULL
        `);
        await ensureConstraint(
            client,
            "usuario_guardiao",
            "usuario_guardiao_estado_vinculo_valido",
            "CHECK (estado_vinculo IN ('pendente', 'confirmado', 'revogado'))"
        );
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS usuario_guardiao_token_vinculo_unico
            ON usuario_guardiao (token_vinculo_hash)
            WHERE token_vinculo_hash IS NOT NULL
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS solicitacao_falecimento (
                id SERIAL PRIMARY KEY,
                fkusuario INTEGER NOT NULL REFERENCES usuario(id),
                status VARCHAR(32) NOT NULL DEFAULT 'aguardando_confirmacoes'
                    CHECK (status IN ('aguardando_confirmacoes', 'confirmada', 'cancelada', 'expirada')),
                confirmacoes_necessarias SMALLINT NOT NULL DEFAULT 3
                    CHECK (confirmacoes_necessarias >= 3),
                solicitado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                confirmado_em TIMESTAMPTZ,
                iniciado_por_vinculo INTEGER REFERENCES usuario_guardiao(id)
            )
        `);
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS solicitacao_falecimento_pendente_unica
            ON solicitacao_falecimento (fkusuario)
            WHERE status = 'aguardando_confirmacoes'
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS confirmacao_falecimento (
                id SERIAL PRIMARY KEY,
                fksolicitacao INTEGER NOT NULL
                    REFERENCES solicitacao_falecimento(id) ON DELETE CASCADE,
                fkusuarioguardiao INTEGER NOT NULL REFERENCES usuario_guardiao(id),
                token_hash CHAR(64) NOT NULL UNIQUE,
                expira_em TIMESTAMPTZ NOT NULL,
                confirmado_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT confirmacao_falecimento_guardiao_unica
                    UNIQUE (fksolicitacao, fkusuarioguardiao)
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS confirmacao_falecimento_pendente_idx
            ON confirmacao_falecimento (expira_em)
            WHERE confirmado_em IS NULL
        `);

        await client.query("COMMIT");
        console.log("Schema de mensagens, destinatários e confirmação por guardiões aplicado.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração do sistema de mensagens não aplicada; nenhuma alteração foi mantida.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateMessageSystem().catch(async (error) => {
    console.error("Não foi possível iniciar a migração do sistema de mensagens.", error);
    await pool.end();
    process.exitCode = 1;
});
