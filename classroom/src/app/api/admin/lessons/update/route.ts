import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

function linesToList(s: string | undefined | null) {
  const raw = (s ?? "").trim();
  if (!raw) return null;
  const items = raw
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

const Schema = z.object({
  lessonId: z.string().min(1),
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
  description: z.string().optional(),
  goalsText: z.string().optional(),
  outlineText: z.string().optional(),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    lessonId: typeof form.get("lessonId") === "string" ? form.get("lessonId") : "",
    title: typeof form.get("title") === "string" ? form.get("title") : "",
    vimeoVideoId: typeof form.get("vimeoVideoId") === "string" ? form.get("vimeoVideoId") : "",
    durationSeconds: typeof form.get("durationSeconds") === "string" ? form.get("durationSeconds") : undefined,
    isPublished: typeof form.get("isPublished") === "string" ? form.get("isPublished") : undefined,
    description: typeof form.get("description") === "string" ? form.get("description") : undefined,
    goalsText: typeof form.get("goalsText") === "string" ? form.get("goalsText") : undefined,
    outlineText: typeof form.get("outlineText") === "string" ? form.get("outlineText") : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const goals = linesToList(parsed.data.goalsText);
  const outline = linesToList(parsed.data.outlineText);
  const description = parsed.data.description?.trim() || null;

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: { id: true, course: { select: { ownerId: true } } },
  });
  if (!lesson || lesson.course.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });
  }

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      title: parsed.data.title.trim(),
      vimeoVideoId: parsed.data.vimeoVideoId.trim(),
      durationSeconds: parsed.data.durationSeconds,
      isPublished: parsed.data.isPublished,
      description,
      goals: goals ?? Prisma.DbNull,
      outline: outline ?? Prisma.DbNull,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


