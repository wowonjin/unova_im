-- Add optional teacher name to Course for admin UI (create/list/filter).
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;

-- Optional index for filtering/searching by teacher.
CREATE INDEX IF NOT EXISTS "Course_teacherName_idx" ON "Course" ("teacherName");


