import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// In some Next.js build/prerender worker processes, `.env` isn't always loaded early enough.
// If DB env vars are missing but a local `.env` file exists, load it defensively.
(() => {
  const hasDbEnv =
    Boolean(process.env.DATABASE_URL) ||
    Boolean(process.env.POSTGRES_PRISMA_URL) ||
    Boolean(process.env.POSTGRES_URL_NON_POOLING) ||
    Boolean(process.env.POSTGRES_URL);

  if (hasDbEnv) return;

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: envPath });
  } catch {
    // ignore (dotenv is a transitive dep of next in most setups)
  }
})();

declare global {
  var __prisma: PrismaClient | undefined;
}

let _prisma: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  const isPostgres = dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));

  if (isPostgres) {
    // PostgreSQL 어댑터 사용 (Prisma 7 필수)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");

    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Vercel/production must use a real Postgres connection string.
  // Serverless functions do not reliably support local SQLite files (and the filesystem is ephemeral/read-only).
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      [
        "DATABASE_URL is not set. This deployment requires Postgres on Vercel.",
        "Set DATABASE_URL (or Vercel Postgres envs like POSTGRES_URL/POSTGRES_PRISMA_URL) and redeploy.",
      ].join(" ")
    );
  }

  // 로컬 개발 환경: SQLite (better-sqlite3 어댑터)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

  // file:./dev_local.db 또는 DATABASE_PATH 형식 지원
  let dbPath = process.env.DATABASE_PATH || "dev.db";
  let sqliteUrl: string | undefined;
  if (dbUrl && dbUrl.startsWith("file:")) {
    sqliteUrl = dbUrl;
    dbPath = dbUrl.replace("file:", "");
  }
  if (!sqliteUrl) {
    sqliteUrl = `file:${dbPath}`;
  }
  // Prisma 7 adapter-better-sqlite3 expects a config object with a `url` (file:...) string.
  const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });
  return new PrismaClient({ adapter });
}

// Lazy initialization
function getPrismaClient(): PrismaClient {
  if (global.__prisma) return global.__prisma;
  if (_prisma) return _prisma;

  _prisma = createPrismaClient();
  
  if (process.env.NODE_ENV !== "production") {
    global.__prisma = _prisma;
  }
  
  return _prisma;
}

// Proxy를 사용해 lazy initialization 구현
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
