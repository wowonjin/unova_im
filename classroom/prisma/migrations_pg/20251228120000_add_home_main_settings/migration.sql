-- Add tables for home main carousel(slides) and shortcut icons.

CREATE TABLE IF NOT EXISTS "HomeSlide" (
  "id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "tag" TEXT,
  "titleHtml" TEXT NOT NULL,
  "subtitle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HomeSlide_isActive_position_createdAt_idx"
  ON "HomeSlide" ("isActive", "position", "createdAt");
CREATE INDEX IF NOT EXISTS "HomeSlide_createdAt_idx"
  ON "HomeSlide" ("createdAt");

CREATE TABLE IF NOT EXISTS "HomeShortcut" (
  "id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "label" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT NOT NULL,
  "bgColor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeShortcut_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HomeShortcut_isActive_position_createdAt_idx"
  ON "HomeShortcut" ("isActive", "position", "createdAt");
CREATE INDEX IF NOT EXISTS "HomeShortcut_createdAt_idx"
  ON "HomeShortcut" ("createdAt");


