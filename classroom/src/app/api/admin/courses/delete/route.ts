import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: typeof form.get("courseId") === "string" ? form.get("courseId") : "",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });
  if (!course || course.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });
  }

  await prisma.course.delete({ where: { id: course.id } });

  return NextResponse.redirect(new URL("/admin", req.url));
}


