#!/usr/bin/env node
/**
 * 배포 시 DATABASE_URL이 설정되어 있을 때만 prisma migrate deploy 실행
 * DB가 없으면 마이그레이션을 건너뜁니다.
 * P3009(이전에 실패한 마이그레이션이 DB에 기록됨) 발생 시:
 * - 실패한 마이그레이션 이름을 자동으로 추출/조회
 * - DB에 저장된 실패 로그를 출력
 * - 해당 마이그레이션을 rolled-back 처리 후 재시도
 */
const { execSync } = require("child_process");
const fs = require("node:fs");
const path = require("node:path");

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

function runCmd(cmd) {
  try {
    const stdout = execSync(cmd, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (stdout) process.stdout.write(stdout);
    return { success: true, output: stdout || "" };
  } catch (err) {
    const stdout = err?.stdout?.toString?.() ?? "";
    const stderr = err?.stderr?.toString?.() ?? "";
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    return {
      success: false,
      error: err?.message || String(err),
      output: `${stdout}\n${stderr}`.trim(),
    };
  }
}

function runMigrateDeploy() {
  return runCmd("npx prisma migrate deploy");
}

async function ensureStoreSchema(connectionString) {
  // Safety net: even if migrate deploy doesn't apply the latest migrations (e.g. path/provider mismatch),
  // ensure critical store/admin columns exist to prevent Prisma P2022 at runtime.
  // eslint-disable-next-line global-require
  const { Client } = require("pg");
  const client = new Client({ connectionString });
  await client.connect();

  const sqlPath = path.join(
    process.cwd(),
    "prisma",
    "migrations_pg",
    "20251226160000_sync_store_schema",
    "migration.sql"
  );

  let sql = "";
  if (fs.existsSync(sqlPath)) {
    sql = fs.readFileSync(sqlPath, "utf8");
  } else {
    // Minimal fallback (Course/Textbook core store fields)
    sql = `
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "tags" JSONB;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "price" INTEGER;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "dailyPrice" INTEGER;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
      ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;

      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "tags" JSONB;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "price" INTEGER;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
      ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
    `;
  }

  if (sql.trim()) {
    await client.query(sql);
    console.log("✅ Store schema ensured (columns/tables).");
  }

  await client.end();
}

function extractFailedMigrationNames(output) {
  const names = new Set();

  // Example line:
  // The `0003_add_course_subject_and_position` migration started at ... failed
  const re = /The\s+[`'"]([^`'"]+)[`'"]\s+migration\s+started/gi;
  let m;
  while ((m = re.exec(output)) !== null) {
    if (m[1]) names.add(m[1]);
  }

  return [...names];
}

async function fetchFailedMigrationsFromDb(connectionString) {
  try {
    // Only attempt DB query if pg is installed (it is in this repo).
    // If this fails, we still proceed with output parsing.
    // eslint-disable-next-line global-require
    const { Client } = require("pg");
    const client = new Client({ connectionString });
    await client.connect();
    const { rows } = await client.query(`
      SELECT
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        logs
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
      ORDER BY started_at DESC
    `);
    await client.end();
    return rows || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  // 첫 번째 시도
  let result = runMigrateDeploy();

  if (!result.success) {
    const output = result.output || "";
    const isP3009 = /Error:\s*P3009/i.test(output) || /P3009/i.test(output);

    if (!isP3009) {
      console.error("❌ 마이그레이션 실패:", result.error);
      process.exit(1);
    }

    console.log("⚠️  P3009 감지: DB에 실패한 마이그레이션 기록이 있어 해결을 시도합니다...");

    const dbFailed = await fetchFailedMigrationsFromDb(dbUrl);
    if (dbFailed.length > 0) {
      console.log("🔎 DB에 기록된 실패 마이그레이션:");
      for (const row of dbFailed) {
        console.log(`- ${row.migration_name} (started_at=${row.started_at})`);
        if (row.logs) {
          console.log("  --- logs ---");
          // 너무 길어질 수 있어 적당히 자릅니다.
          const text = String(row.logs);
          console.log(text.length > 4000 ? `${text.slice(0, 4000)}\n... (truncated)` : text);
          console.log("  --- end logs ---");
        }
      }
    }

    const parsed = extractFailedMigrationNames(output);
    const namesToResolve = [
      ...new Set([
        ...dbFailed.map((r) => r.migration_name).filter(Boolean),
        ...parsed,
      ]),
    ];

    if (namesToResolve.length === 0) {
      console.error(
        "❌ P3009는 감지됐지만 실패한 마이그레이션 이름을 추출하지 못했습니다. 출력 로그를 확인해 주세요."
      );
      process.exit(1);
    }

    for (const migration of namesToResolve) {
      try {
        console.log(`🔄 마이그레이션 rolled-back 처리: ${migration}`);
        runCmd(`npx prisma migrate resolve --rolled-back ${migration}`);
      } catch {
        // runCmd가 이미 출력하고 success=false로 반환하므로 여기선 무시
      }
    }

    // 재시도
    console.log("🔄 마이그레이션 재시도...");
    result = runMigrateDeploy();

    if (!result.success) {
      console.error("❌ 마이그레이션 최종 실패:", result.error);
      process.exit(1);
    }
  }

  // Final safety net to prevent runtime P2022 ("column does not exist")
  try {
    await ensureStoreSchema(dbUrl);
  } catch (e) {
    console.error("❌ 스키마 동기화(안전망) 실패:", e);
    process.exit(1);
  }
}

console.log("🛠️  Starting migration step...");

main().catch((e) => {
  console.error("❌ 마이그레이션 스크립트 실행 중 예외:", e);
  process.exit(1);
});

