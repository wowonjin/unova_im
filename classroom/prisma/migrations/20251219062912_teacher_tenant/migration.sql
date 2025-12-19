-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "imwebProdNo" INTEGER,
    "imwebProdCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Course_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Course" ("createdAt", "description", "id", "imwebGroupCode", "imwebProdCode", "imwebProdNo", "isPublished", "slug", "thumbnailMimeType", "thumbnailOriginalName", "thumbnailSizeBytes", "thumbnailStoredPath", "thumbnailUrl", "title", "updatedAt") SELECT "createdAt", "description", "id", "imwebGroupCode", "imwebProdCode", "imwebProdNo", "isPublished", "slug", "thumbnailMimeType", "thumbnailOriginalName", "thumbnailSizeBytes", "thumbnailStoredPath", "thumbnailUrl", "title", "updatedAt" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE UNIQUE INDEX "Course_imwebGroupCode_key" ON "Course"("imwebGroupCode");
CREATE UNIQUE INDEX "Course_imwebProdCode_key" ON "Course"("imwebProdCode");
CREATE INDEX "Course_ownerId_idx" ON "Course"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
