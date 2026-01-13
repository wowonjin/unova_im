import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// In some Next.js build/prerender worker processes, `.env` isn't always loaded early enough.
// If DB env vars are missing but a local `.env`/`.env.local` file exists, load it defensively.
(() => {
  const hasDbEnv =
    Boolean(process.env.DATABASE_URL) ||
    Boolean(process.env.POSTGRES_PRISMA_URL) ||
    Boolean(process.env.POSTGRES_URL_NON_POOLING) ||
    Boolean(process.env.POSTGRES_URL);

  if (hasDbEnv) return;

  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require("dotenv");
    if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  } catch {
    // ignore (dotenv is a transitive dep of next in most setups)
  }
})();

declare global {
  var __prisma: PrismaClient | undefined;
}

let _prisma: PrismaClient | undefined;

function ensureFreshClient(client: PrismaClient): PrismaClient {
  // In dev, PrismaClient is cached globally to prevent hot-reload connection storms.
  // But if the Prisma schema changes (new model added) without restarting the dev server,
  // the cached client can be missing new delegates (e.g., `prisma.teacher`).
  // If we detect that, recreate the client once.
  const anyClient = client as unknown as Record<string, unknown>;
  if (typeof anyClient.teacher === "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[prisma] cached PrismaClient is missing `teacher` delegate. Recreating client...");
    try {
      client.$disconnect();
    } catch {
      // ignore
    }
    const fresh = createPrismaClient();
    global.__prisma = fresh;
    _prisma = fresh;
    return fresh;
  }
  return client;
}

function shouldUsePgSsl(dbUrl: string): boolean {
  if (process.env.PGSSLMODE === "require") return true;
  try {
    const u = new URL(dbUrl);
    const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
    const ssl = (u.searchParams.get("ssl") || "").toLowerCase();
    if (sslmode === "require") return true;
    if (ssl === "true" || ssl === "1") return true;
    // Render external Postgres hostnames end with ".render.com" (internal hostnames often don't).
    if (u.hostname.endsWith(".render.com")) return true;
    // 일부 환경에서 Render Postgres 호스트가 "dpg-xxxx-a" 형태로 축약돼 들어오는 경우가 있습니다.
    // Render Postgres는 보통 SSL이 필요하므로 이런 케이스는 SSL을 강제합니다.
    if (u.hostname.startsWith("dpg-")) return true;
  } catch {
    // ignore
  }
  return false;
}

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

    const pool = new Pool({
      connectionString: dbUrl,
      ssl: shouldUsePgSsl(dbUrl) ? { rejectUnauthorized: false } : undefined,
      // DB가 죽어있거나 네트워크가 불안정할 때 "페이지 전환이 10초씩 멈춤"을 유발하는 경우가 있어
      // 연결 시도는 짧게 실패하도록(빠른 폴백/UI 노출) 타임아웃을 둡니다.
      // (단위: ms)
      connectionTimeoutMillis: 3000,
    });
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
  if (global.__prisma) return ensureFreshClient(global.__prisma);
  if (_prisma) return ensureFreshClient(_prisma);

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
