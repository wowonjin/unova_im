-- Add Teacher table (safe for existing DBs)
CREATE TABLE IF NOT EXISTS "Teacher" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_slug_key" ON "Teacher"("slug");
CREATE INDEX IF NOT EXISTS "Teacher_isActive_position_createdAt_idx" ON "Teacher"("isActive", "position", "createdAt");
CREATE INDEX IF NOT EXISTS "Teacher_subjectName_idx" ON "Teacher"("subjectName");
CREATE INDEX IF NOT EXISTS "Teacher_createdAt_idx" ON "Teacher"("createdAt");


