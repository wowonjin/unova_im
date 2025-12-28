-- Add Course addon selection columns (safe on existing DBs)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedTextbookIds" JSONB;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedCourseIds" JSONB;


