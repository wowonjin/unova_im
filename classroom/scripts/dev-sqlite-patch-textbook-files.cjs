#!/usr/bin/env node
/**
 * Local dev helper: patch SQLite dev.db to include new Textbook.files column.
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

db.close();
console.log("[dev-sqlite-patch-textbook-files] OK:", { db: fullPath, added: { files: needFiles } });

