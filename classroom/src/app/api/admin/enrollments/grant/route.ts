import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  courseId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(3650).default(365),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const form = await req.formData();

  const data = {
    email: form.get("email"),
    courseId: form.get("courseId"),
    days: form.get("days") ?? "365",
  };

  const parsed = Schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const { email, courseId, days } = parsed.data;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, ownerId: true } });
  if (!course) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });
  if (course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const targetUser = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: targetUser.id, courseId } },
    update: { status: "ACTIVE", startAt, endAt },
    create: { userId: targetUser.id, courseId, status: "ACTIVE", startAt, endAt },
  });

  const base = getBaseUrl(req);
  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", base));
}


