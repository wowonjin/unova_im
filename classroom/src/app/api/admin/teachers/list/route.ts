import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

async function ensureTeacherTable() {
  // 로컬/배포 환경에서 마이그레이션이 아직 적용되지 않아 "Teacher" 테이블이 없을 수 있습니다.
  // 관리자 페이지(/admin/teachers)는 동작해야 하므로, 최소 스키마를 안전하게 생성합니다.
  // (Prisma가 id(cuid), updatedAt 갱신은 애플리케이션 레벨에서 처리)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Teacher" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "imageUrl" TEXT,
      "mainImageUrl" TEXT,
      "promoImageUrl" TEXT,
      "youtubeUrl" TEXT,
      "instagramUrl" TEXT,
      "educationText" TEXT,
      "careerText" TEXT,
      "headerSubText" TEXT,
      "pageBgColor" TEXT,
      "menuBgColor" TEXT,
      "newsBgColor" TEXT,
      "ratingBgColor" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 인덱스/유니크는 별도로 보강 (IF NOT EXISTS로 중복 생성 방지)
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_slug_key" ON "Teacher" ("slug");');
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Teacher_isActive_position_createdAt_idx" ON "Teacher" ("isActive", "position", "createdAt");'
  );
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Teacher_subjectName_idx" ON "Teacher" ("subjectName");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Teacher_createdAt_idx" ON "Teacher" ("createdAt");');
}

export async function GET() {
  await requireAdminUser();

  // Ensure optional columns exist (deployment-safe; avoids Prisma migrations).
  try {
    // Teacher 테이블이 없으면 먼저 생성(마이그레이션 미적용 환경 대응)
    await ensureTeacherTable();

    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedCourseIds" JSONB;');
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedTextbookIds" JSONB;');
  } catch {
    // ignore
  }

  // position: 오름차순 정렬용. 0은 "미설정/레거시"이므로 맨 뒤로 보냄.
  let teachers: any[] = [];
  try {
    teachers = (await prisma.teacher.findMany({
      // youtubeUrl 필드 포함 (타입 갱신 전 호환 위해 any 캐스팅)
      select: {
        id: true,
        slug: true,
        name: true,
        subjectName: true,
        imageUrl: true,
        mainImageUrl: true,
        promoImageUrl: true,
        instagramUrl: true,
        youtubeUrl: true,
        educationText: true,
        careerText: true,
        headerSubText: true,
        pageBgColor: true,
        menuBgColor: true,
        newsBgColor: true,
        ratingBgColor: true,
        isActive: true,
        position: true,
        createdAt: true,
      } as any,
    })) as any[];
  } catch (e) {
    // 최후 폴백: 그래도 조회가 실패하면 빈 리스트로 처리하여 UI가 깨지지 않게 함
    // eslint-disable-next-line no-console
    console.warn("[admin/teachers/list] failed to query Teacher table:", e);
    teachers = [];
  }

  // selected ids are stored as JSONB columns (not in Prisma schema) → load via raw.
  let selectedById = new Map<string, { selectedCourseIds: string[]; selectedTextbookIds: string[] }>();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      'SELECT "id", "selectedCourseIds", "selectedTextbookIds" FROM "Teacher"'
    )) as any[];
    selectedById = new Map(
      (rows ?? []).map((r) => [
        String(r.id),
        {
          selectedCourseIds: Array.isArray(r.selectedCourseIds) ? r.selectedCourseIds : [],
          selectedTextbookIds: Array.isArray(r.selectedTextbookIds) ? r.selectedTextbookIds : [],
        },
      ])
    );
  } catch {
    // ignore
  }

  const sorted = teachers.slice().sort((a, b) => {
    const ap = a.position === 0 ? Number.MAX_SAFE_INTEGER : a.position;
    const bp = b.position === 0 ? Number.MAX_SAFE_INTEGER : b.position;
    if (ap !== bp) return ap - bp;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({
    ok: true,
    teachers: sorted.map((t) => ({
      ...t,
      createdAt: new Date(t.createdAt).toISOString(),
      ...(selectedById.get(String(t.id)) ?? { selectedCourseIds: [], selectedTextbookIds: [] }),
    })),
  });
}


