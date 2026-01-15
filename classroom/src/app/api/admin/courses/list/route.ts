import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await requireAdminUser();
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") || "").trim();

  // 기본: "공개된 강좌(전체)" - 레거시 호환
  // scope=teacher-picker: /admin/teachers의 "강좌 선택" 용 → 강좌 판매하기(내 강좌) 기준으로만 노출
  const where =
    scope === "teacher-picker"
      ? { ownerId: admin.id }
      : { isPublished: true };

  const courses = await prisma.course.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      slug: true,
      title: true,
      teacherName: true,
      subjectName: true,
      thumbnailUrl: true,
      thumbnailStoredPath: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      teacherName: c.teacherName,
      subjectName: c.subjectName,
      thumbnailUrl: c.thumbnailUrl,
      thumbnailStoredPath: c.thumbnailStoredPath,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}


