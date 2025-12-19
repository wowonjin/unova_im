-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "imwebGroupCode" TEXT,
    "imwebProdNo" INTEGER,
    "imwebProdCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Course" ("createdAt", "description", "id", "imwebGroupCode", "imwebProdCode", "imwebProdNo", "slug", "thumbnailUrl", "title") SELECT "createdAt", "description", "id", "imwebGroupCode", "imwebProdCode", "imwebProdNo", "slug", "thumbnailUrl", "title" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE UNIQUE INDEX "Course_imwebGroupCode_key" ON "Course"("imwebGroupCode");
CREATE UNIQUE INDEX "Course_imwebProdCode_key" ON "Course"("imwebProdCode");
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "vimeoVideoId" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "goals" JSONB,
    "outline" JSONB,
    CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("courseId", "createdAt", "durationSeconds", "id", "isPublished", "position", "title", "vimeoVideoId") SELECT "courseId", "createdAt", "durationSeconds", "id", "isPublished", "position", "title", "vimeoVideoId" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE INDEX "Lesson_courseId_isPublished_idx" ON "Lesson"("courseId", "isPublished");
CREATE UNIQUE INDEX "Lesson_courseId_position_key" ON "Lesson"("courseId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
