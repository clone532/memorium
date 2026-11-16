const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

if (!process.argv.includes("--confirm-keep-lowest-id")) {
    console.error(
        "Confirme a política de deduplicação executando com --confirm-keep-lowest-id. Será mantida a conta de menor ID por e-mail."
    );
    process.exit(1);
}

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

async function deduplicateUserEmails() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query("LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE");

        const duplicates = await client.query(`
            WITH ranked AS (
                SELECT u.id,
                       ROW_NUMBER() OVER (
                           PARTITION BY LOWER(BTRIM(u.email))
                           ORDER BY
                               CASE
                                   WHEN LOWER(BTRIM(u.email)) = 'admin@gmail.com'
                                        AND UPPER(t.nome) = 'ADMIN' THEN 0
                                   ELSE 1
                               END,
                               u.id
                       ) AS position
                FROM usuario u
                JOIN tipo_usuario t ON t.id = u.tipousuario
            )
            SELECT id FROM ranked WHERE position > 1
        `);
        const duplicateIds = duplicates.rows.map((row) => row.id);

        if (duplicateIds.length > 0) {
            const linked = await client.query(`
                SELECT COUNT(*)::INTEGER AS accounts_with_links,
                       COALESCE(SUM(linked_rows), 0)::INTEGER AS linked_rows
                FROM (
                    SELECT d.id,
                        (SELECT COUNT(*) FROM biografia b WHERE b.fkusuario = d.id)
                        + (SELECT COUNT(*) FROM mural m WHERE m.fkusuario = d.id)
                        + (SELECT COUNT(*) FROM comentario c WHERE c.fkusuario = d.id)
                        + (SELECT COUNT(*) FROM assinatura a WHERE a.fkusuario = d.id)
                        + (SELECT COUNT(*) FROM usuario_guardiao ug WHERE ug.idusuario = d.id) AS linked_rows
                    FROM UNNEST($1::INTEGER[]) AS d(id)
                ) account_links
                WHERE linked_rows > 0
            `, [duplicateIds]);

            if (linked.rows[0].accounts_with_links > 0) {
                throw new Error(
                    `A limpeza foi cancelada: ${linked.rows[0].accounts_with_links} conta(s) excedente(s) têm ${linked.rows[0].linked_rows} registro(s) relacionado(s). Nenhum dado foi apagado.`
                );
            }

            await client.query("DELETE FROM usuario WHERE id = ANY($1::INTEGER[])", [duplicateIds]);
        }

        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_unico
            ON usuario (LOWER(BTRIM(email)))
        `);
        await client.query("COMMIT");
        console.log(`${duplicateIds.length} conta(s) duplicada(s) removida(s); índice único de e-mail aplicado.`);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Deduplicação de e-mails revertida; nenhum dado foi alterado.", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

deduplicateUserEmails().catch(async (error) => {
    console.error("Não foi possível iniciar a deduplicação de e-mails.", error);
    await pool.end();
    process.exitCode = 1;
});
