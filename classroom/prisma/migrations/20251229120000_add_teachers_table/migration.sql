-- Add Teacher table (SQLite/dev)
CREATE TABLE "Teacher" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Teacher_slug_key" ON "Teacher"("slug");
CREATE INDEX "Teacher_isActive_position_createdAt_idx" ON "Teacher"("isActive","position","createdAt");
CREATE INDEX "Teacher_subjectName_idx" ON "Teacher"("subjectName");
CREATE INDEX "Teacher_createdAt_idx" ON "Teacher"("createdAt");


