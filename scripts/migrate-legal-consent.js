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

async function migrateLegalConsent() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            ALTER TABLE usuario
                ADD COLUMN IF NOT EXISTS termos_versao_aceita VARCHAR(20),
                ADD COLUMN IF NOT EXISTS termos_aceito_em TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS privacidade_versao_lida VARCHAR(20),
                ADD COLUMN IF NOT EXISTS privacidade_lida_em TIMESTAMPTZ
        `);
        await client.query("COMMIT");
        console.log("Colunas de aceite dos documentos legais aplicadas.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração de aceite legal não aplicada; nenhuma alteração foi mantida.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateLegalConsent().catch(async (error) => {
    console.error("Não foi possível iniciar a migração de aceite legal.", error);
    await pool.end();
    process.exitCode = 1;
});
