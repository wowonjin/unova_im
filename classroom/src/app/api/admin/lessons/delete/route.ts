import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 관리자 권한 확인
    await requireAdminUser();
    
    const body = await req.json();
    const { lessonId } = body as { lessonId: string };

    if (!lessonId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Find the lesson (관리자는 모든 강의 삭제 가능)
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Delete the lesson (cascade will delete attachments and progress)
    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    // Re-order remaining lessons
    const remainingLessons = await prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { position: "asc" },
    });

    await prisma.$transaction(
      remainingLessons.map((l, index) =>
        prisma.lesson.update({
          where: { id: l.id },
          data: { position: index + 1 },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
