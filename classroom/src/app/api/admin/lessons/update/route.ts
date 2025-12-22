import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { Prisma } from "@prisma/client";
import { fetchVimeoOembedMeta, normalizeVimeoVideoId } from "@/lib/vimeo-oembed";

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
  vimeoVideoId: z.string().min(1).max(256),
  durationSeconds: z
    .string()
    .optional()
    .transform((s) => (typeof s === "string" && s.trim() !== "" ? Number(s) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: "INVALID_DURATION" }),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
  refreshVimeoTitle: z
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
    vimeoVideoId: typeof form.get("vimeoVideoId") === "string" ? form.get("vimeoVideoId") : "",
    durationSeconds: typeof form.get("durationSeconds") === "string" ? form.get("durationSeconds") : undefined,
    isPublished: typeof form.get("isPublished") === "string" ? form.get("isPublished") : undefined,
    refreshVimeoTitle: typeof form.get("refreshVimeoTitle") === "string" ? form.get("refreshVimeoTitle") : undefined,
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
    select: { id: true, vimeoVideoId: true, title: true, durationSeconds: true, course: { select: { ownerId: true } } },
  });
  if (!lesson || lesson.course.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });
  }

  const normalizedId = normalizeVimeoVideoId(parsed.data.vimeoVideoId);
  if (!normalizedId) return NextResponse.json({ ok: false, error: "INVALID_VIMEO_ID" }, { status: 400 });

  const shouldRefreshTitle = Boolean(parsed.data.refreshVimeoTitle) || normalizedId !== (lesson.vimeoVideoId ?? "");
  const vimeoMeta = shouldRefreshTitle ? await fetchVimeoOembedMeta(normalizedId) : { title: null, durationSeconds: null };
  if (shouldRefreshTitle && !vimeoMeta.title) {
    return NextResponse.json({ ok: false, error: "VIMEO_NOT_FOUND" }, { status: 400 });
  }

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      // Title is derived from Vimeo (oEmbed). We only refresh when requested or video changes,
      // so description-only saves won't depend on Vimeo being reachable.
      title: shouldRefreshTitle ? (vimeoMeta.title as string) : lesson.title,
      vimeoVideoId: normalizedId,
      durationSeconds:
        shouldRefreshTitle ? vimeoMeta.durationSeconds ?? parsed.data.durationSeconds ?? lesson.durationSeconds : parsed.data.durationSeconds,
      isPublished: parsed.data.isPublished,
      description,
      goals: goals ?? Prisma.DbNull,
      outline: outline ?? Prisma.DbNull,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


