-- Allow reusing the same Imweb product code across multiple courses/textbooks.
-- Old migrations created UNIQUE indexes that can break admin create flows in production.

-- CourseImwebProdCode.code was UNIQUE in initial migration; drop and create non-unique index instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'CourseImwebProdCode_code_key'
  ) THEN
    DROP INDEX IF EXISTS "CourseImwebProdCode_code_key";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CourseImwebProdCode_code_idx" ON "CourseImwebProdCode" ("code");

-- Textbook.imwebProdCode was UNIQUE in initial migration; drop and keep non-unique index.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Textbook_imwebProdCode_key'
  ) THEN
    DROP INDEX IF EXISTS "Textbook_imwebProdCode_key";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Textbook_imwebProdCode_idx" ON "Textbook" ("imwebProdCode");


