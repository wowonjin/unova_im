#!/usr/bin/env node
/**
 * Local dev helper: patch SQLite dev.db to include new Course columns used by Prisma schema.
 * This project uses SQLite in local dev via Prisma driver adapter, while schema provider stays postgresql.
 * Prisma migrate deploy is configured for Postgres only, so we patch SQLite manually.
 */
const path = require("node:path");
const fs = require("node:fs");

const dbPath = process.env.DATABASE_PATH || "dev.db";
const fullPath = path.resolve(process.cwd(), dbPath);

if (!fs.existsSync(fullPath)) {
  console.error(`[dev-sqlite-patch-course] DB file not found: ${fullPath}`);
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
  } catch (e) {
    // ignore if already exists / or unsupported
  }
}

function ensureIndex(sql) {
  try {
    db.exec(sql);
  } catch (e) {
    // ignore
  }
}

const needSubject = !hasColumn("Course", "subjectName");
const needPosition = !hasColumn("Course", "position");

if (needSubject) ensureColumn(`ALTER TABLE "Course" ADD COLUMN "subjectName" TEXT;`);
if (needPosition) ensureColumn(`ALTER TABLE "Course" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;`);

ensureIndex(`CREATE INDEX IF NOT EXISTS "Course_subjectName_idx" ON "Course" ("subjectName");`);
ensureIndex(`CREATE UNIQUE INDEX IF NOT EXISTS "Course_ownerId_position_key" ON "Course" ("ownerId", "position");`);

// Backfill positions (1..N per owner) if any owned rows still have 0.
try {
  db.exec(`
    WITH ranked AS (
      SELECT
        id,
        ownerId,
        ROW_NUMBER() OVER (PARTITION BY ownerId ORDER BY createdAt ASC, id ASC) AS rn
      FROM "Course"
      WHERE ownerId IS NOT NULL
    )
    UPDATE "Course"
    SET position = (SELECT rn FROM ranked WHERE ranked.id = "Course".id)
    WHERE id IN (SELECT id FROM ranked) AND (position IS NULL OR position = 0);
  `);
} catch (e) {
  // ignore
}

db.close();
console.log("[dev-sqlite-patch-course] OK:", { db: fullPath, added: { subjectName: needSubject, position: needPosition } });


