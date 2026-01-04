import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();

  // Ensure optional columns exist (deployment-safe; avoids Prisma migrations).
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedCourseIds" JSONB;');
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedTextbookIds" JSONB;');
  } catch {
    // ignore
  }

  // position: 오름차순 정렬용. 0은 "미설정/레거시"이므로 맨 뒤로 보냄.
  const teachers = (await prisma.teacher.findMany({
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


