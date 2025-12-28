-- Add composition field for Textbook basic info (safe for existing DBs)
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "composition" TEXT;


