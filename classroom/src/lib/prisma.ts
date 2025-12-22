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

  if (!dbUrl) {
    throw new Error(
      [
        "DATABASE_URL is not set. This app requires Postgres.",
        "Set DATABASE_URL (or platform-provided Postgres envs like POSTGRES_URL/POSTGRES_PRISMA_URL) and restart/redeploy.",
      ].join(" ")
    );
  }

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

  // This repo's Prisma schema uses `provider = "postgresql"`.
  // SQLite adapters are not compatible with that provider.
  throw new Error(
    [
      "DATABASE_URL must be a Postgres connection string (postgres:// or postgresql://).",
      `Received: ${String(dbUrl).slice(0, 32)}...`,
    ].join(" ")
  );
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
