-- Course에 enrollmentDays 추가
ALTER TABLE "Course" ADD COLUMN "enrollmentDays" INTEGER NOT NULL DEFAULT 365;

-- Textbook에 entitlementDays 추가
ALTER TABLE "Textbook" ADD COLUMN "entitlementDays" INTEGER NOT NULL DEFAULT 365;

