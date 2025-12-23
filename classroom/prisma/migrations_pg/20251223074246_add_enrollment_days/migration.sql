-- DropIndex
DROP INDEX "CourseImwebProdCode_code_key";

-- DropIndex
DROP INDEX "Textbook_imwebProdCode_key";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "enrollmentDays" INTEGER NOT NULL DEFAULT 365;

-- AlterTable
ALTER TABLE "Textbook" ADD COLUMN     "entitlementDays" INTEGER NOT NULL DEFAULT 365;

-- CreateIndex
CREATE INDEX "CourseImwebProdCode_code_idx" ON "CourseImwebProdCode"("code");

-- CreateIndex
CREATE INDEX "Textbook_imwebProdCode_idx" ON "Textbook"("imwebProdCode");
