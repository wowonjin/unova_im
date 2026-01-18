-- Add teacher reply fields to Review
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "teacherReply" TEXT;

ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "teacherReplyAt" TIMESTAMP(3);

