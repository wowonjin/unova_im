-- Add optional teacher name to Textbook for admin UI + store display.
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;

-- Optional index for filtering/searching by teacher.
CREATE INDEX IF NOT EXISTS "Textbook_teacherName_idx" ON "Textbook" ("teacherName");


