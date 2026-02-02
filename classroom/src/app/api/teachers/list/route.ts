import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  // deployment-safe: 마이그레이션 미적용 환경에서도 새 컬럼이 있으면 노출할 수 있게 보강
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "universityIconUrl" TEXT;');
  } catch {
    // ignore
  }

  // position: 오름차순 정렬용. 0은 "미설정/레거시"이므로 맨 뒤로 보냄.
  const teachers = await prisma.teacher.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      name: true,
      subjectName: true,
      imageUrl: true,
      universityIconUrl: true,
      position: true,
      createdAt: true,
    },
  });

  const blockedNames = new Set(["이상엽"]);

  const sorted = teachers
    .slice()
    .filter((t) => !blockedNames.has((t.name || "").trim()))
    .sort((a, b) => {
      const ap = a.position === 0 ? Number.MAX_SAFE_INTEGER : a.position;
      const bp = b.position === 0 ? Number.MAX_SAFE_INTEGER : b.position;
      if (ap !== bp) return ap - bp;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      subjectName: t.subjectName,
      imageUrl: t.imageUrl,
      universityIconUrl: (t as any).universityIconUrl ?? null,
      position: t.position,
    }));

  const res = NextResponse.json({ ok: true, teachers: sorted });
  // 선생님 목록은 자주 바뀌지 않으므로 짧은 CDN/브라우저 캐시로 반복 로딩 비용을 줄입니다.
  res.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
  return res;
}


