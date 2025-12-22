const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const path = require("node:path");

// Load `.env.local` / `.env` for local runs.
(() => {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) return;
  try {
    const dotenv = require("dotenv");
    if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  } catch {
    // ignore
  }
})();

function shouldUsePgSsl(dbUrl) {
  if (process.env.PGSSLMODE === "require") return true;
  try {
    const u = new URL(dbUrl);
    const sslmode = String(u.searchParams.get("sslmode") || "").toLowerCase();
    const ssl = String(u.searchParams.get("ssl") || "").toLowerCase();
    if (sslmode === "require") return true;
    if (ssl === "true" || ssl === "1") return true;
    if (String(u.hostname || "").endsWith(".render.com")) return true;
  } catch {
    // ignore
  }
  return false;
}

function createPrisma() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  const isPostgres = dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));

  if (isPostgres) {
    const { Pool } = require("pg");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: shouldUsePgSsl(dbUrl) ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

  const dbPath = process.env.DATABASE_PATH || "dev.db";
  const sqliteUrl = dbUrl && dbUrl.startsWith("file:") ? dbUrl : `file:${dbPath}`;
  const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrisma();
  try {
    console.log("PrismaClient has notice delegate:", Boolean(prisma.notice));
    // print Notice fields according to runtime data model
    const model = prisma._runtimeDataModel?.models?.Notice;
    const fields = model?.fields?.map((f) => f.name) ?? [];
    console.log("Notice fields:", fields);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


