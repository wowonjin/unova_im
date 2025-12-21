#!/usr/bin/env node
/**
 * 배포 시 DATABASE_URL이 설정되어 있을 때만 prisma migrate deploy 실행
 * DB가 없으면 마이그레이션을 건너뜁니다.
 */
const { execSync } = require("child_process");

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

if (!dbUrl) {
  console.log("⚠️  DATABASE_URL이 설정되지 않아 마이그레이션을 건너뜁니다.");
  console.log("   Vercel 환경변수에 DATABASE_URL을 설정한 후 다시 배포하세요.");
  process.exit(0);
}

console.log("✅ DATABASE_URL 감지됨. 마이그레이션을 실행합니다...");

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} catch (err) {
  console.error("❌ 마이그레이션 실패:", err.message);
  process.exit(1);
}

