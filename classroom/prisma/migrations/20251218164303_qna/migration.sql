-- CreateTable
CREATE TABLE "QnaPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "pinnedAt" DATETIME,
    "pinnedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QnaPost_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QnaPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QnaPost_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QnaImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QnaImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "QnaPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QnaImage_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QnaPost_lessonId_pinnedAt_createdAt_idx" ON "QnaPost"("lessonId", "pinnedAt", "createdAt");

-- CreateIndex
CREATE INDEX "QnaPost_userId_createdAt_idx" ON "QnaPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QnaImage_postId_idx" ON "QnaImage"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "QnaImage_attachmentId_key" ON "QnaImage"("attachmentId");
