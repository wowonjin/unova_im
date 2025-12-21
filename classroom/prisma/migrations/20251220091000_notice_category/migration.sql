-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Notice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '공지',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Notice" ("authorId", "body", "createdAt", "id", "isPublished", "slug", "title", "updatedAt")
SELECT "authorId", "body", "createdAt", "id", "isPublished", "slug", "title", "updatedAt" FROM "Notice";

DROP TABLE "Notice";
ALTER TABLE "new_Notice" RENAME TO "Notice";

CREATE UNIQUE INDEX "Notice_slug_key" ON "Notice"("slug");
CREATE INDEX "Notice_authorId_createdAt_idx" ON "Notice"("authorId", "createdAt");
CREATE INDEX "Notice_isPublished_createdAt_idx" ON "Notice"("isPublished", "createdAt");
CREATE INDEX "Notice_category_createdAt_idx" ON "Notice"("category", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


