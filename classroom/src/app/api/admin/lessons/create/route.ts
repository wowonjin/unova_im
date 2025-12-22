import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { fetchVimeoOembedMeta, normalizeVimeoVideoId } from "@/lib/vimeo-oembed";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  vimeoVideoId: z.string().min(1).max(256),
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
    vimeoVideoId: typeof form.get("vimeoVideoId") === "string" ? form.get("vimeoVideoId") : "",
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

  const normalizedId = normalizeVimeoVideoId(parsed.data.vimeoVideoId);
  if (!normalizedId) return NextResponse.json({ ok: false, error: "INVALID_VIMEO_ID" }, { status: 400 });

  // Fetch current Vimeo title (and duration as a bonus) via oEmbed (no auth).
  // This keeps the lesson title derived from Vimeo, not manually edited.
  const meta = await fetchVimeoOembedMeta(normalizedId);
  if (!meta.title) return NextResponse.json({ ok: false, error: "VIMEO_NOT_FOUND" }, { status: 400 });

  await prisma.lesson.create({
    data: {
      courseId: parsed.data.courseId,
      title: meta.title,
      position,
      vimeoVideoId: normalizedId,
      durationSeconds: meta.durationSeconds,
      isPublished: parsed.data.isPublished,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${parsed.data.courseId}`, req.url));
}


