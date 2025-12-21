import { PrismaClient } from "@prisma/client";

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

  // 로컬 개발 환경: SQLite (better-sqlite3 어댑터)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSQLite3 } = require("@prisma/adapter-better-sqlite3");

  // file:./dev_local.db 또는 DATABASE_PATH 형식 지원
  let dbPath = process.env.DATABASE_PATH || "dev.db";
  if (dbUrl && dbUrl.startsWith("file:")) {
    dbPath = dbUrl.replace("file:", "");
  }
  const db = new Database(dbPath);
  const adapter = new PrismaBetterSQLite3(db);
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
