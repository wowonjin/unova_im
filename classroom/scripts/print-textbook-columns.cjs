const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  // Load env like Prisma CLI config does (.env.local first, then .env)
  try {
    const dotenv = require("dotenv");
    const envLocal = path.join(process.cwd(), ".env.local");
    const env = path.join(process.cwd(), ".env");
    if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
    if (fs.existsSync(env)) dotenv.config({ path: env });
  } catch {
    // ignore
  }

  const cs =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  if (!cs) {
    console.error("NO_DB_URL");
    process.exit(2);
  }

  const client = new Client({
    connectionString: cs,
    // Render/Vercel Postgres often requires SSL; rejectUnauthorized=false is standard for these environments.
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const { rows } = await client.query(
      "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='Textbook' order by ordinal_position"
    );
    for (const r of rows) {
      process.stdout.write(`${r.column_name}\t${r.data_type}\n`);
    }
  } finally {
    await client.end().catch(() => null);
  }
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});

