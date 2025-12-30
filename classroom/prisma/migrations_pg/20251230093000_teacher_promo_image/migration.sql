-- Add promoImageUrl to Teacher (Postgres)
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "promoImageUrl" TEXT;


