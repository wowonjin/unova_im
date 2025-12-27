-- Add Course.relatedTextbookIds for "교재 함께 구매" selection (safe on existing DBs)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedTextbookIds" JSONB;
-- Add Course.relatedCourseIds for "추가 상품(강좌)" selection
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedCourseIds" JSONB;


