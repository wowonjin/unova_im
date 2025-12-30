-- Add mainImageUrl to Teacher (Postgres)
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "mainImageUrl" TEXT;


