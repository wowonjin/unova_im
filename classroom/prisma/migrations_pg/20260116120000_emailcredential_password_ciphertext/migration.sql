-- Store encrypted (admin-visible) password for EmailCredential (Postgres)
ALTER TABLE "EmailCredential" ADD COLUMN IF NOT EXISTS "passwordCiphertext" TEXT;

