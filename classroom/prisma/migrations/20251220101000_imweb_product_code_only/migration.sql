-- Drop legacy numeric product mapping (imwebProdNo) and keep prod_custom_code only
-- SQLite requires table redefine to drop columns.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Course: drop imwebProdNo
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailStoredPath" TEXT,
    "thumbnailOriginalName" TEXT,
    "thumbnailMimeType" TEXT,
    "thumbnailSizeBytes" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "imwebGroupCode" TEXT,
    "imwebProdCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Course_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Course" (
  "id",
  "ownerId",
  "title",
  "slug",
  "description",
  "thumbnailUrl",
  "thumbnailStoredPath",
  "thumbnailOriginalName",
  "thumbnailMimeType",
  "thumbnailSizeBytes",
  "isPublished",
  "imwebGroupCode",
  "imwebProdCode",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "ownerId",
  "title",
  "slug",
  "description",
  "thumbnailUrl",
  "thumbnailStoredPath",
  "thumbnailOriginalName",
  "thumbnailMimeType",
  "thumbnailSizeBytes",
  "isPublished",
  "imwebGroupCode",
  "imwebProdCode",
  "createdAt",
  "updatedAt"
FROM "Course";

DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE UNIQUE INDEX "Course_imwebGroupCode_key" ON "Course"("imwebGroupCode");
CREATE UNIQUE INDEX "Course_imwebProdCode_key" ON "Course"("imwebProdCode");
CREATE INDEX "Course_ownerId_idx" ON "Course"("ownerId");

-- Textbook: drop imwebProdNo
CREATE TABLE "new_Textbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "imwebProdCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Textbook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Textbook" (
  "id",
  "ownerId",
  "title",
  "storedPath",
  "originalName",
  "mimeType",
  "sizeBytes",
  "isPublished",
  "imwebProdCode",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "ownerId",
  "title",
  "storedPath",
  "originalName",
  "mimeType",
  "sizeBytes",
  "isPublished",
  "imwebProdCode",
  "createdAt",
  "updatedAt"
FROM "Textbook";

DROP TABLE "Textbook";
ALTER TABLE "new_Textbook" RENAME TO "Textbook";
CREATE INDEX "Textbook_ownerId_createdAt_idx" ON "Textbook"("ownerId", "createdAt");
CREATE UNIQUE INDEX "Textbook_imwebProdCode_key" ON "Textbook"("imwebProdCode");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


