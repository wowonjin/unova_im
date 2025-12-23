import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return req.headers.get("x-unova-client") === "1" || accept.includes("application/json");
}

const Schema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  thumbnailUrl: z.string().optional(),
  teacherName: z
    .string()
    .optional()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .refine((s) => s.length <= 80, { message: "teacherName too long" }),
  subjectName: z
    .string()
    .optional()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .refine((s) => s.length <= 80, { message: "subjectName too long" }),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function POST(req: Request) {
  const json = wantsJson(req);
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const raw = {
    courseId: form.get("courseId"),
    title: form.get("title"),
    slug: form.get("slug"),
    thumbnailUrl: form.get("thumbnailUrl"),
    teacherName: form.get("teacherName"),
    subjectName: form.get("subjectName"),
    isPublished: form.get("isPublished"),
  };

  const parsed = Schema.safeParse({
    courseId: typeof raw.courseId === "string" ? raw.courseId : "",
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    slug: typeof raw.slug === "string" ? raw.slug.trim() : "",
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : undefined,
    teacherName: typeof raw.teacherName === "string" ? raw.teacherName : undefined,
    subjectName: typeof raw.subjectName === "string" ? raw.subjectName : undefined,
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

  try {
    // thumbnailUrl은 명시적으로 전달된 경우에만 업데이트 (자동 저장 시 삭제 방지)
    const updateData: Record<string, unknown> = {
      title: parsed.data.title,
      slug: cleanSlug,
      teacherName: parsed.data.teacherName?.length ? parsed.data.teacherName : null,
      subjectName: parsed.data.subjectName?.length ? parsed.data.subjectName : null,
      // NOTE: To allow flipping false via client auto-save, the client sends "1"/"0".
      // If omitted (legacy form submit), Prisma treats undefined as "do not change".
      isPublished: parsed.data.isPublished,
    };

    // thumbnailUrl이 폼에서 명시적으로 전달된 경우에만 업데이트
    if (raw.thumbnailUrl !== null && typeof raw.thumbnailUrl === "string") {
      updateData.thumbnailUrl = raw.thumbnailUrl.trim().length ? raw.thumbnailUrl.trim() : null;
    }

    await prisma.course.update({
      where: { id: course.id },
      data: updateData,
    });
  } catch (e: any) {
    // Unique constraint (e.g. slug already taken)
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "SLUG_TAKEN" }, { status: 409 });
    }
    throw e;
  }

  if (json) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${parsed.data.courseId}`, req.url));
}


