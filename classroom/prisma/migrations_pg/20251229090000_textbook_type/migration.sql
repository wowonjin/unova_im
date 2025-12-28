-- Add textbookType field for Textbook detail settings (safe for existing DBs)
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "textbookType" TEXT;


