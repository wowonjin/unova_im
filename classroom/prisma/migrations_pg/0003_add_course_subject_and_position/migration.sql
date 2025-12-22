-- Add subjectName + position ordering to Course (postgres/neon).

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Course_subjectName_idx" ON "Course" ("subjectName");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_ownerId_position_key" ON "Course" ("ownerId", "position");

-- Backfill positions for owned courses (1..N per owner). Keep legacy/unowned rows at 0.
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


