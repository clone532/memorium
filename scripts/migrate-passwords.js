const bcrypt = require("bcryptjs");
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

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function migratePasswords() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query('ALTER TABLE "usuario" ALTER COLUMN "senha" TYPE VARCHAR(255)');

        const { rows } = await client.query('SELECT "id", "senha" FROM "usuario" FOR UPDATE');
        let migratedCount = 0;
        let alreadyHashedCount = 0;

        for (const row of rows) {
            if (bcryptHashPattern.test(row.senha)) {
                alreadyHashedCount += 1;
                continue;
            }

            const passwordHash = await bcrypt.hash(row.senha, 10);
            await client.query('UPDATE "usuario" SET "senha" = $1 WHERE "id" = $2', [
                passwordHash,
                row.id
            ]);
            migratedCount += 1;
        }

        await client.query("COMMIT");
        console.log(`Migração concluída: ${migratedCount} senha(s) convertida(s); ${alreadyHashedCount} já estavam em bcrypt.`);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração de senhas falhou; as alterações foram revertidas.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migratePasswords().catch(async (error) => {
    console.error("Não foi possível iniciar a migração de senhas.", error);
    await pool.end();
    process.exitCode = 1;
});
