-- Add optional teacher profile fields to Textbook for store detail page.
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherTitle" TEXT;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherDescription" TEXT;

CREATE INDEX IF NOT EXISTS "Textbook_teacherTitle_idx" ON "Textbook" ("teacherTitle");


