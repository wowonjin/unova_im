#!/usr/bin/env node
/**
 * 배포 시 DATABASE_URL이 설정되어 있을 때만 prisma migrate deploy 실행
 * DB가 없으면 마이그레이션을 건너뜁니다.
 * 실패한 마이그레이션이 있으면 자동으로 롤백 처리 후 재시도합니다.
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

function runMigrate() {
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 첫 번째 시도
let result = runMigrate();

if (!result.success) {
  // P3009 에러 (실패한 마이그레이션) 감지 시 자동 해결 시도
  console.log("⚠️  마이그레이션 실패. 실패한 마이그레이션 해결 시도 중...");
  
  // 실패한 마이그레이션 목록 확인 및 롤백 처리
  const failedMigrations = [
    "0003_add_course_subject_and_position"
  ];
  
  for (const migration of failedMigrations) {
    try {
      console.log(`🔄 마이그레이션 롤백 처리: ${migration}`);
      execSync(`npx prisma migrate resolve --rolled-back ${migration}`, { stdio: "inherit" });
    } catch (resolveErr) {
      // 이미 해결되었거나 존재하지 않으면 무시
      console.log(`   (이미 해결됨 또는 해당 없음)`);
    }
  }
  
  // 재시도
  console.log("🔄 마이그레이션 재시도...");
  result = runMigrate();
  
  if (!result.success) {
    console.error("❌ 마이그레이션 최종 실패:", result.error);
    process.exit(1);
  }
}

console.log("✅ 마이그레이션 완료!");

