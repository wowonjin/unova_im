import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await requireAdminUser();
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") || "").trim();

  // 기본: "공개된 교재(전체)" - 레거시 호환
  // scope=teacher-picker: /admin/teachers의 "교재 선택" 용 → 교재 판매하기(가격 설정된 교재) 기준으로만 노출
  const where =
    scope === "teacher-picker"
      ? {
          ownerId: admin.id,
          OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
        }
      : { isPublished: true };

  const textbooks = await prisma.textbook.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      title: true,
      teacherName: true,
      subjectName: true,
      thumbnailUrl: true,
      composition: true,
      textbookType: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    textbooks: textbooks.map((t) => ({
      id: t.id,
      title: t.title,
      teacherName: t.teacherName,
      subjectName: t.subjectName,
      thumbnailUrl: t.thumbnailUrl,
      composition: t.composition,
      textbookType: t.textbookType,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}


