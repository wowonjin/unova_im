-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QnaPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL DEFAULT 'STUDENT',
    "parentId" TEXT,
    "deletedAt" DATETIME,
    "pinnedAt" DATETIME,
    "pinnedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QnaPost_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QnaPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QnaPost_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QnaPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "QnaPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QnaPost" ("body", "createdAt", "deletedAt", "id", "lessonId", "pinnedAt", "pinnedById", "updatedAt", "userId") SELECT "body", "createdAt", "deletedAt", "id", "lessonId", "pinnedAt", "pinnedById", "updatedAt", "userId" FROM "QnaPost";
DROP TABLE "QnaPost";
ALTER TABLE "new_QnaPost" RENAME TO "QnaPost";
CREATE INDEX "QnaPost_lessonId_pinnedAt_createdAt_idx" ON "QnaPost"("lessonId", "pinnedAt", "createdAt");
CREATE INDEX "QnaPost_userId_createdAt_idx" ON "QnaPost"("userId", "createdAt");
CREATE INDEX "QnaPost_parentId_idx" ON "QnaPost"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
