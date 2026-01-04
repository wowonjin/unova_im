import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();

  const textbooks = await prisma.textbook.findMany({
    where: { isPublished: true },
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


