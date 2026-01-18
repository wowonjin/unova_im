#!/usr/bin/env node
/**
 * Local dev helper: patch SQLite dev.db to include Textbook schema columns used by Prisma schema.
 * This project uses SQLite in local dev via Prisma driver adapter, while schema provider stays postgresql.
 */
const path = require("node:path");
const fs = require("node:fs");

const dbPath = process.env.DATABASE_PATH || "dev.db";
const fullPath = path.resolve(process.cwd(), dbPath);

if (!fs.existsSync(fullPath)) {
  console.error(`[dev-sqlite-patch-textbook-files] DB file not found: ${fullPath}`);
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require("better-sqlite3");
const db = new Database(fullPath);
db.pragma("journal_mode = WAL");

function hasColumn(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r && r.name === col);
}

function ensureColumn(sql) {
  try {
    db.exec(sql);
  } catch {
    // ignore
  }
}

const needFiles = !hasColumn("Textbook", "files");
if (needFiles) {
  // SQLite에는 JSON 타입이 없으므로 TEXT로 저장 (Prisma Json과 호환)
  ensureColumn(`ALTER TABLE "Textbook" ADD COLUMN "files" TEXT;`);
}

const needGradeCategory = !hasColumn("Textbook", "gradeCategory");
if (needGradeCategory) {
  // Prisma enum (TextbookGradeCategory) 호환: SQLite에서는 TEXT로 저장
  // 기존 데이터/로컬 DB에서도 동작하도록 기본값은 'G1_2'
  ensureColumn(`ALTER TABLE "Textbook" ADD COLUMN "gradeCategory" TEXT NOT NULL DEFAULT 'G1_2';`);
}

db.close();
console.log("[dev-sqlite-patch-textbook-files] OK:", { db: fullPath, added: { files: needFiles, gradeCategory: needGradeCategory } });

