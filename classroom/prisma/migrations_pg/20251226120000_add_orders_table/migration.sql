-- Create enums + Order table if missing.
-- This repo's early migrations_pg did not include Order-related schema, so Render DBs can miss it.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductType') THEN
    CREATE TYPE "ProductType" AS ENUM ('COURSE', 'TEXTBOOK');
  END IF;
END $$;

-- Ensure enum value exists (in case enum was created earlier without it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PARTIALLY_REFUNDED'
    ) THEN
      ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_REFUNDED';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productType" "ProductType" NOT NULL,
  "courseId" TEXT,
  "textbookId" TEXT,
  "orderNo" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT,
  "refundedAmount" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT,
  "providerPaymentKey" TEXT,
  "providerPayload" JSONB,
  "enrolled" BOOLEAN NOT NULL DEFAULT false,
  "enrolledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- Uniques / Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_orderNo_key'
  ) THEN
    CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_userId_createdAt_idx'
  ) THEN
    CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_status_createdAt_idx'
  ) THEN
    CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_courseId_idx'
  ) THEN
    CREATE INDEX "Order_courseId_idx" ON "Order"("courseId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_textbookId_idx'
  ) THEN
    CREATE INDEX "Order_textbookId_idx" ON "Order"("textbookId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_provider_idx'
  ) THEN
    CREATE INDEX "Order_provider_idx" ON "Order"("provider");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Order_providerPaymentKey_idx'
  ) THEN
    CREATE INDEX "Order_providerPaymentKey_idx" ON "Order"("providerPaymentKey");
  END IF;
END $$;

-- Foreign keys (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_userId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_courseId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_textbookId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_textbookId_fkey"
      FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


