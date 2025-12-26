// Prisma CLI config.
// We load `.env.local` first (Next.js convention), then `.env` as fallback.
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

(() => {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
})();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // 운영(Vercel Postgres)용 마이그레이션
    // (기존 sqlite용 migrations는 prisma/migrations에 남아있어도 되지만,
    // provider가 postgresql로 바뀌면 sqlite SQL이 깨질 수 있어 별도 폴더로 분리합니다.)
    path: "prisma/migrations_pg",
  },
  datasource: {
    // Vercel Postgres 연동 시 자동으로 세팅되는 env 이름들도 지원
    url:
      process.env["DATABASE_URL"] ||
      process.env["POSTGRES_PRISMA_URL"] ||
      process.env["POSTGRES_URL_NON_POOLING"] ||
      process.env["POSTGRES_URL"],
  },
});
