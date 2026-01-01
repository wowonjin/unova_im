-- Add youtubeUrl to Teacher (Postgres)
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT;


