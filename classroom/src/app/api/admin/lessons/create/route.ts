import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  vimeoVideoId: z.string().min(1).max(64),
  durationSeconds: z
    .string()
    .optional()
    .transform((s) => (typeof s === "string" && s.trim() !== "" ? Number(s) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: "INVALID_DURATION" }),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: typeof form.get("courseId") === "string" ? form.get("courseId") : "",
    title: typeof form.get("title") === "string" ? form.get("title") : "",
    vimeoVideoId: typeof form.get("vimeoVideoId") === "string" ? form.get("vimeoVideoId") : "",
    durationSeconds: typeof form.get("durationSeconds") === "string" ? form.get("durationSeconds") : undefined,
    isPublished: typeof form.get("isPublished") === "string" ? form.get("isPublished") : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });
  if (!course || course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const last = await prisma.lesson.findFirst({
    where: { courseId: parsed.data.courseId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;

  await prisma.lesson.create({
    data: {
      courseId: parsed.data.courseId,
      title: parsed.data.title.trim(),
      position,
      vimeoVideoId: parsed.data.vimeoVideoId.trim(),
      durationSeconds: parsed.data.durationSeconds,
      isPublished: parsed.data.isPublished,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${parsed.data.courseId}`, req.url));
}


