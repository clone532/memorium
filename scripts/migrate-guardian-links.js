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

async function migrateGuardianLinks() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const nullLinks = await client.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM usuario_guardiao
            WHERE idusuario IS NULL OR idguardiao IS NULL
        `);
        const duplicatePairs = await client.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM (
                SELECT 1
                FROM usuario_guardiao
                GROUP BY idusuario, idguardiao
                HAVING COUNT(*) > 1
            ) duplicates
        `);

        if (nullLinks.rows[0].total > 0 || duplicatePairs.rows[0].total > 0) {
            throw new Error(
                `Há ${nullLinks.rows[0].total} vínculo(s) incompleto(s) e ${duplicatePairs.rows[0].total} par(es) duplicado(s). Nenhum registro foi alterado.`
            );
        }

        await client.query(`
            ALTER TABLE usuario_guardiao
                ALTER COLUMN idusuario SET NOT NULL,
                ALTER COLUMN idguardiao SET NOT NULL
        `);

        const constraint = await client.query(`
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'usuario_guardiao_unico'
              AND conrelid = 'usuario_guardiao'::regclass
        `);
        if (constraint.rowCount === 0) {
            await client.query(`
                ALTER TABLE usuario_guardiao
                ADD CONSTRAINT usuario_guardiao_unico UNIQUE (idusuario, idguardiao)
            `);
        }

        await client.query("COMMIT");
        console.log("Restrições de integridade dos vínculos de guardião aplicadas.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migração dos vínculos de guardião não aplicada.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateGuardianLinks().catch(async (error) => {
    console.error("Não foi possível iniciar a migração dos vínculos de guardião.", error);
    await pool.end();
    process.exitCode = 1;
});
