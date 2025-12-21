-- Support multiple Imweb product codes per Course via mapping table.
-- SQLite requires table redefine to drop columns.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1) Create mapping table
CREATE TABLE "CourseImwebProdCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseImwebProdCode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CourseImwebProdCode_code_key" ON "CourseImwebProdCode"("code");
CREATE INDEX "CourseImwebProdCode_courseId_idx" ON "CourseImwebProdCode"("courseId");

-- 2) Backfill existing Course.imwebProdCode into the mapping table
INSERT INTO "CourseImwebProdCode" ("id", "courseId", "code", "createdAt")
SELECT
  lower(hex(randomblob(16))) AS "id",
  "id" AS "courseId",
  trim("imwebProdCode") AS "code",
  CURRENT_TIMESTAMP AS "createdAt"
FROM "Course"
WHERE "imwebProdCode" IS NOT NULL AND length(trim("imwebProdCode")) > 0;

-- 3) Drop the old single-column field by redefining Course
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
  "createdAt",
  "updatedAt"
FROM "Course";

DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";

CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE UNIQUE INDEX "Course_imwebGroupCode_key" ON "Course"("imwebGroupCode");
CREATE INDEX "Course_ownerId_idx" ON "Course"("ownerId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


