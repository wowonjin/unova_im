import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  dir: z.enum(["up", "down"]),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: typeof form.get("courseId") === "string" ? form.get("courseId") : "",
    dir: typeof form.get("dir") === "string" ? form.get("dir") : "up",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true, position: true },
  });
  if (!course || course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const curPos = course.position ?? 0;
  const targetPos = parsed.data.dir === "up" ? curPos - 1 : curPos + 1;
  if (curPos < 1 || targetPos < 1) {
    return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/courses", req.url));
  }

  const other = await prisma.course.findFirst({
    where: { ownerId: teacher.id, position: targetPos },
    select: { id: true, position: true },
  });
  if (!other) return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/courses", req.url));

  // unique(ownerId, position) 때문에 임시 포지션 사용 (음수는 사용하지 않음)
  await prisma.$transaction([
    prisma.course.update({ where: { id: course.id }, data: { position: -1 } }),
    prisma.course.update({ where: { id: other.id }, data: { position: curPos } }),
    prisma.course.update({ where: { id: course.id }, data: { position: other.position } }),
  ]);

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/courses", req.url));
}


