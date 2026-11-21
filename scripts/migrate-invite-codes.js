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

async function migrateInviteCodes() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query(`
            ALTER TABLE Usuario
            ADD COLUMN IF NOT EXISTS codigo_convite CHAR(6),
            ADD COLUMN IF NOT EXISTS codigo_convite_expira_em TIMESTAMPTZ
        `);
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS usuario_codigo_convite_unico
            ON Usuario (codigo_convite)
            WHERE codigo_convite IS NOT NULL
        `);
        await client.query("COMMIT");
        console.log("Códigos de convite adicionados ao banco.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração dos códigos de convite não aplicada.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateInviteCodes().catch(async (error) => {
    console.error("Não foi possível iniciar a migração dos códigos de convite.", error);
    await pool.end();
    process.exitCode = 1;
});
