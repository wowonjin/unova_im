-- Add Imweb product mapping fields to Course
ALTER TABLE "Course" ADD COLUMN "imwebProdNo" INTEGER;
ALTER TABLE "Course" ADD COLUMN "imwebProdCode" TEXT;

-- Unique mapping by product custom code (NULL allowed multiple times in SQLite)
CREATE UNIQUE INDEX "Course_imwebProdCode_key" ON "Course"("imwebProdCode");


