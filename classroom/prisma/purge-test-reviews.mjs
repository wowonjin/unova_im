import prismaPkg from "@prisma/client";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = prismaPkg;

// Load `.env.local` / `.env` for local dev runs (same approach as seed.mjs)
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
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PATH; // sqlite fallback handled below

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
  const urlFromEnv = process.env.DATABASE_URL;
  const sqliteUrl =
    urlFromEnv && urlFromEnv.startsWith("file:")
      ? urlFromEnv
      : `file:${process.env.DATABASE_PATH || "dev.db"}`;
  const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

const yes = process.argv.includes("--yes") || process.argv.includes("-y");

// Heuristics: remove clearly test/seed reviews
const where = {
  OR: [
    { authorName: { startsWith: "테스터" } },
    { authorName: { contains: "test", mode: "insensitive" } },
    { content: { contains: "리뷰 테스트" } },
    { content: { contains: "test", mode: "insensitive" } },
  ],
};

async function main() {
  const count = await prisma.review.count({ where });
  console.log(`[purge-test-reviews] candidates: ${count}`);

  const sample = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, authorName: true, rating: true, content: true, createdAt: true, productType: true },
  });
  console.log("[purge-test-reviews] sample (latest 10):");
  for (const r of sample) {
    console.log(`- ${r.id} | ${r.productType} | ${r.authorName} | ${r.rating} | ${r.createdAt.toISOString()} | ${String(r.content).slice(0, 80)}`);
  }

  if (!yes) {
    console.log("\nDRY RUN: not deleting. Re-run with --yes to delete.");
    return;
  }

  const res = await prisma.review.deleteMany({ where });
  console.log(`[purge-test-reviews] deleted: ${res.count}`);
}

main()
  .catch((e) => {
    console.error("[purge-test-reviews] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


