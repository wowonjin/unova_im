import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  // position: 오름차순 정렬용. 0은 "미설정/레거시"이므로 맨 뒤로 보냄.
  const teachers = await prisma.teacher.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      name: true,
      subjectName: true,
      imageUrl: true,
      position: true,
      createdAt: true,
    },
  });

  const sorted = teachers
    .slice()
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
      position: t.position,
    }));

  return NextResponse.json({ ok: true, teachers: sorted });
}


