import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

// NOTE: Prisma Client는 스키마 변경 후 generate/migrate 이후에 dev 서버에서 모듈이 새로 로드되어야 합니다.
function getSqlitePath() {
  const sqliteUrl = process.env.DATABASE_URL || "file:./dev.db";
  const raw = sqliteUrl.startsWith("file:") ? sqliteUrl.slice("file:".length) : sqliteUrl;
  return path.resolve(process.cwd(), raw);
}

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: getSqlitePath() }),
  });

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;


