import { prisma } from "@/lib/prisma";

let _ensuredSoldOutColumns = false;

/**
 * 런타임에서 DB 스키마가 최신이 아닐 때(마이그레이션 누락/지연)에도
 * "품절" 기능이 페이지/라우트를 깨지지 않게 하기 위한 안전장치입니다.
 *
 * - 권한이 부족하거나(Managed DB) 정책상 ALTER가 막혀 있으면 조용히 무시합니다.
 * - 최신 스키마라면 no-op 입니다.
 */
export async function ensureSoldOutColumnsOnce() {
  if (_ensuredSoldOutColumns) return;
  _ensuredSoldOutColumns = true;

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "isSoldOut" BOOLEAN NOT NULL DEFAULT false;'
    );
  } catch {
    // ignore
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "isSoldOut" BOOLEAN NOT NULL DEFAULT false;'
    );
  } catch {
    // ignore
  }
}

