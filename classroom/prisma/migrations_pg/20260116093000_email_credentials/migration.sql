-- Add EmailCredential table (Postgres)
CREATE TABLE "EmailCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailCredential_userId_key" ON "EmailCredential"("userId");
CREATE INDEX "EmailCredential_userId_idx" ON "EmailCredential"("userId");

ALTER TABLE "EmailCredential"
ADD CONSTRAINT "EmailCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

