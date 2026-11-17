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

async function migrateNotifications() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            CREATE TABLE IF NOT EXISTS notificacao (
                id SERIAL PRIMARY KEY,
                fkusuario INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
                titulo VARCHAR(255) NOT NULL,
                conteudo TEXT NOT NULL,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                lida_em TIMESTAMPTZ
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS notificacao_usuario_recente_idx
            ON notificacao (fkusuario, criado_em DESC)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS notificacao_usuario_nao_lida_idx
            ON notificacao (fkusuario)
            WHERE lida_em IS NULL
        `);
        await client.query("COMMIT");
        console.log("Tabela de notificações aplicada.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração de notificações não aplicada; nenhuma alteração foi mantida.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateNotifications().catch(async (error) => {
    console.error("Não foi possível iniciar a migração de notificações.", error);
    await pool.end();
    process.exitCode = 1;
});
