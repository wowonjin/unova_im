-- Add subjectName + position ordering to Course (postgres/neon).

-- 1. 컬럼 추가
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

-- 2. subjectName 인덱스 생성
CREATE INDEX IF NOT EXISTS "Course_subjectName_idx" ON "Course" ("subjectName");

-- 3. Backfill positions BEFORE creating unique index (1..N per owner)
WITH ranked AS (
  SELECT
    id,
    "ownerId",
    ROW_NUMBER() OVER (PARTITION BY "ownerId" ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "Course"
  WHERE "ownerId" IS NOT NULL
)
UPDATE "Course" c
SET "position" = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

-- 4. UNIQUE INDEX 마지막에 생성 (backfill 완료 후)
CREATE UNIQUE INDEX IF NOT EXISTS "Course_ownerId_position_key" ON "Course" ("ownerId", "position");


