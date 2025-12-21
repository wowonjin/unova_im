import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  thumbnailUrl: z.string().optional(),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const raw = {
    courseId: form.get("courseId"),
    title: form.get("title"),
    slug: form.get("slug"),
    thumbnailUrl: form.get("thumbnailUrl"),
    isPublished: form.get("isPublished"),
  };

  const parsed = Schema.safeParse({
    courseId: typeof raw.courseId === "string" ? raw.courseId : "",
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    slug: typeof raw.slug === "string" ? raw.slug.trim() : "",
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : undefined,
    isPublished: typeof raw.isPublished === "string" ? raw.isPublished : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const cleanSlug = slugify(parsed.data.slug);
  if (!cleanSlug) return NextResponse.json({ ok: false, error: "INVALID_SLUG" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });
  if (!course || course.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });
  }

  await prisma.course.update({
    where: { id: course.id },
    data: {
      title: parsed.data.title,
      slug: cleanSlug,
      thumbnailUrl: parsed.data.thumbnailUrl?.trim().length ? parsed.data.thumbnailUrl.trim() : null,
      isPublished: parsed.data.isPublished,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${parsed.data.courseId}`, req.url));
}


