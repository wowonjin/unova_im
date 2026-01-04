import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();

  const courses = await prisma.course.findMany({
    where: { isPublished: true },
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


