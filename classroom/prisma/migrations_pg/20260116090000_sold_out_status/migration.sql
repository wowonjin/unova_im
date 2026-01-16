-- Add sold-out flag for store products (course/textbook)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "isSoldOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "isSoldOut" BOOLEAN NOT NULL DEFAULT false;

