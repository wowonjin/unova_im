-- Add Popup table for main page popups (admin managed).

CREATE TABLE IF NOT EXISTS "Popup" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "position" TEXT NOT NULL DEFAULT 'center',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Popup_isActive_startAt_endAt_idx'
  ) THEN
    CREATE INDEX "Popup_isActive_startAt_endAt_idx" ON "Popup" ("isActive", "startAt", "endAt");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Popup_createdAt_idx'
  ) THEN
    CREATE INDEX "Popup_createdAt_idx" ON "Popup" ("createdAt");
  END IF;
END $$;


