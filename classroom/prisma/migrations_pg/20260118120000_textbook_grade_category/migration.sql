-- Add grade category for textbooks (home section routing: SUNEUNG / TRANSFER / G1_2)

DO $$
BEGIN
  CREATE TYPE "TextbookGradeCategory" AS ENUM ('G1_2', 'SUNEUNG', 'TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Textbook"
  ADD COLUMN IF NOT EXISTS "gradeCategory" "TextbookGradeCategory" NOT NULL DEFAULT 'G1_2';

