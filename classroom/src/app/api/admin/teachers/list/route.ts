import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();

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
      isActive: true,
      position: true,
      createdAt: true,
    } as any,
  })) as any[];

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
    })),
  });
}


