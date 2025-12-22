-- Add subjectName + position ordering to Course (sqlite/dev).

ALTER TABLE "Course" ADD COLUMN "subjectName" TEXT;
ALTER TABLE "Course" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Course_subjectName_idx" ON "Course" ("subjectName");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_ownerId_position_key" ON "Course" ("ownerId", "position");

-- Backfill positions for owned courses (1..N per owner), keeping legacy/unowned rows at 0.
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
WHERE id IN (SELECT id FROM ranked);


