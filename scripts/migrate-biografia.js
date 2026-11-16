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

async function migrateBiografia() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query(`
            ALTER TABLE "biografia"
                ADD COLUMN IF NOT EXISTS "conteudo" TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS "tipoanexo" VARCHAR(100),
                ADD COLUMN IF NOT EXISTS "datahora" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        `);
        await client.query('ALTER TABLE "biografia" ALTER COLUMN "anexourl" DROP NOT NULL');
        await client.query('ALTER TABLE "biografia" ALTER COLUMN "fkmensagem" DROP NOT NULL');
        await client.query("COMMIT");
        console.log("Migração da tabela Biografia concluída.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração da tabela Biografia falhou; as alterações foram revertidas.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateBiografia().catch(async (error) => {
    console.error("Não foi possível iniciar a migração da tabela Biografia.", error);
    await pool.end();
    process.exitCode = 1;
});
