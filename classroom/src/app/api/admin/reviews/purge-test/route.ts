import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const where = {
    OR: [
      { authorName: { startsWith: "테스터" } },
      { authorName: { contains: "test", mode: "insensitive" as const } },
      { content: { contains: "리뷰 테스트" } },
      { content: { contains: "test", mode: "insensitive" as const } },
    ],
  };

  const res = await prisma.review.deleteMany({ where });
  return NextResponse.json({ ok: true, deleted: res.count });
}


