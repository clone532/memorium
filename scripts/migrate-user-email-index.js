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

async function migrateUserEmailIndex() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const { rows } = await client.query(`
            SELECT COUNT(*)::INTEGER AS duplicate_groups,
                   COALESCE(SUM(extra_rows), 0)::INTEGER AS extra_rows
            FROM (
                SELECT COUNT(*) - 1 AS extra_rows
                FROM usuario
                GROUP BY LOWER(BTRIM(email))
                HAVING COUNT(*) > 1
            ) duplicates
        `);
        const { duplicate_groups, extra_rows } = rows[0];

        if (duplicate_groups > 0) {
            throw new Error(
                `Foram encontrados ${duplicate_groups} grupos de e-mails duplicados (${extra_rows} registro(s) excedente(s)). Resolva-os antes de aplicar o índice; nenhum registro foi alterado.`
            );
        }

        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_unico
            ON usuario (LOWER(BTRIM(email)))
        `);
        await client.query("COMMIT");
        console.log("Índice único de e-mail aplicado.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração do índice de e-mail não aplicada.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateUserEmailIndex().catch(async (error) => {
    console.error("Não foi possível iniciar a migração do índice de e-mail.", error);
    await pool.end();
    process.exitCode = 1;
});
