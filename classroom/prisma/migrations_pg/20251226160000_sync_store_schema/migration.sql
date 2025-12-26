-- Sync Postgres schema with current Prisma models used by store/admin.
-- Fixes Prisma P2022 errors like "column reviewCount does not exist".

-- === Course: add missing columns ===
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "price" INTEGER;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "dailyPrice" INTEGER;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "benefits" JSONB;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "features" JSONB;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherTitle" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherDescription" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "previewVimeoId" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "refundPolicy" TEXT;

-- enrollmentDays may be missing on old DBs
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "enrollmentDays" INTEGER NOT NULL DEFAULT 365;

-- Indices (safe)
CREATE INDEX IF NOT EXISTS "Course_teacherName_idx" ON "Course" ("teacherName");
CREATE INDEX IF NOT EXISTS "Course_subjectName_idx" ON "Course" ("subjectName");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_ownerId_position_key" ON "Course" ("ownerId", "position");

-- === Textbook: add missing columns ===
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherTitle" TEXT;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherDescription" TEXT;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;

ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "entitlementDays" INTEGER NOT NULL DEFAULT 365;

ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "price" INTEGER;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "originalPrice" INTEGER;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "benefits" JSONB;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "features" JSONB;
ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Indices (safe)
CREATE INDEX IF NOT EXISTS "Textbook_teacherName_idx" ON "Textbook" ("teacherName");
CREATE INDEX IF NOT EXISTS "Textbook_imwebProdCode_idx" ON "Textbook" ("imwebProdCode");

-- === Ensure ProductType enum exists (used by Review/ProductLike/Order) ===
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductType') THEN
    CREATE TYPE "ProductType" AS ENUM ('COURSE', 'TEXTBOOK');
  END IF;
END $$;

-- === Review table (store reviews) ===
CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "productType" "ProductType" NOT NULL,
  "courseId" TEXT,
  "textbookId" TEXT,
  "userId" TEXT,
  "authorName" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrls" JSONB,
  "isApproved" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Review_courseId_createdAt_idx" ON "Review" ("courseId", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_textbookId_createdAt_idx" ON "Review" ("textbookId", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_isApproved_createdAt_idx" ON "Review" ("isApproved", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_userId_fkey') THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_courseId_fkey') THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_textbookId_fkey') THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_textbookId_fkey"
      FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- === ProductLike table (store likes) ===
CREATE TABLE IF NOT EXISTS "ProductLike" (
  "id" TEXT NOT NULL,
  "productType" "ProductType" NOT NULL,
  "courseId" TEXT,
  "textbookId" TEXT,
  "visitorId" TEXT NOT NULL,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductLike_pkey" PRIMARY KEY ("id")
);

-- Unique constraints (safe: only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductLike_productType_courseId_visitorId_key'
  ) THEN
    ALTER TABLE "ProductLike"
      ADD CONSTRAINT "ProductLike_productType_courseId_visitorId_key"
      UNIQUE ("productType", "courseId", "visitorId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductLike_productType_textbookId_visitorId_key'
  ) THEN
    ALTER TABLE "ProductLike"
      ADD CONSTRAINT "ProductLike_productType_textbookId_visitorId_key"
      UNIQUE ("productType", "textbookId", "visitorId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductLike_courseId_idx" ON "ProductLike" ("courseId");
CREATE INDEX IF NOT EXISTS "ProductLike_textbookId_idx" ON "ProductLike" ("textbookId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductLike_userId_fkey') THEN
    ALTER TABLE "ProductLike"
      ADD CONSTRAINT "ProductLike_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductLike_courseId_fkey') THEN
    ALTER TABLE "ProductLike"
      ADD CONSTRAINT "ProductLike_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductLike_textbookId_fkey') THEN
    ALTER TABLE "ProductLike"
      ADD CONSTRAINT "ProductLike_textbookId_fkey"
      FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


