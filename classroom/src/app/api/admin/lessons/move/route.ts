import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  lessonId: z.string().min(1),
  dir: z.enum(["up", "down"]),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    lessonId: typeof form.get("lessonId") === "string" ? form.get("lessonId") : "",
    dir: typeof form.get("dir") === "string" ? form.get("dir") : "up",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: { id: true, courseId: true, position: true, course: { select: { ownerId: true } } },
  });
  if (!lesson) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });
  if (lesson.course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });

  const targetPos = parsed.data.dir === "up" ? lesson.position - 1 : lesson.position + 1;
  if (targetPos < 1) return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${lesson.courseId}`, req.url));

  const other = await prisma.lesson.findFirst({
    where: { courseId: lesson.courseId, position: targetPos },
    select: { id: true, position: true },
  });
  if (!other) return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${lesson.courseId}`, req.url));

  // unique(courseId, position) 때문에 임시 포지션 사용
  await prisma.$transaction([
    prisma.lesson.update({ where: { id: lesson.id }, data: { position: 0 } }),
    prisma.lesson.update({ where: { id: other.id }, data: { position: lesson.position } }),
    prisma.lesson.update({ where: { id: lesson.id }, data: { position: other.position } }),
  ]);

  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${lesson.courseId}`, req.url));
}


