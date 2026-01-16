-- Store encrypted (admin-visible) password for EmailCredential (SQLite/dev)
ALTER TABLE "EmailCredential" ADD COLUMN IF NOT EXISTS "passwordCiphertext" TEXT;

