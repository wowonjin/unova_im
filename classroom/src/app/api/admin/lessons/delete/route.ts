import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  lessonId: z.string().min(1),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    lessonId: typeof form.get("lessonId") === "string" ? form.get("lessonId") : "",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: { courseId: true, course: { select: { ownerId: true } } },
  });
  if (!lesson) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });
  if (lesson.course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });

  await prisma.lesson.delete({ where: { id: parsed.data.lessonId } });

  // position 재정렬(빈 구멍 제거)
  const lessons = await prisma.lesson.findMany({
    where: { courseId: lesson.courseId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  for (let i = 0; i < lessons.length; i++) {
    await prisma.lesson.update({ where: { id: lessons[i].id }, data: { position: i + 1 } });
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${lesson.courseId}`, req.url));
}


