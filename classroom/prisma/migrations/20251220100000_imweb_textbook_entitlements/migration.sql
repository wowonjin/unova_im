-- Add Imweb product mapping fields to Textbook
ALTER TABLE "Textbook" ADD COLUMN "imwebProdNo" INTEGER;
ALTER TABLE "Textbook" ADD COLUMN "imwebProdCode" TEXT;

-- Unique mapping by product custom code (NULL allowed multiple times in SQLite)
CREATE UNIQUE INDEX "Textbook_imwebProdCode_key" ON "Textbook"("imwebProdCode");

-- CreateTable
CREATE TABLE "TextbookEntitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "orderNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TextbookEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TextbookEntitlement_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TextbookEntitlement_userId_textbookId_key" ON "TextbookEntitlement"("userId", "textbookId");
CREATE INDEX "TextbookEntitlement_userId_status_idx" ON "TextbookEntitlement"("userId", "status");
CREATE INDEX "TextbookEntitlement_textbookId_status_idx" ON "TextbookEntitlement"("textbookId", "status");
CREATE INDEX "TextbookEntitlement_orderNo_idx" ON "TextbookEntitlement"("orderNo");


