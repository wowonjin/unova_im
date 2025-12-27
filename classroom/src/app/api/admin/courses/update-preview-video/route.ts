import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  vimeoUrl: z.string().optional().default("").transform((s) => s.trim()),
});

function extractVimeoId(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  // pure numeric id
  if (/^\d{6,}$/.test(s)) return s;
  // common vimeo URLs
  // - https://vimeo.com/123456789
  // - https://player.vimeo.com/video/123456789?h=...
  // - https://vimeo.com/channels/staffpicks/123456789
  const m = s.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/|album\/\d+\/video\/)?(\d{6,})/i);
  if (m?.[1]) return m[1];
  const m2 = s.match(/\/(\d{6,})(?:\?|#|$)/);
  return m2?.[1] ?? null;
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: typeof form.get("courseId") === "string" ? (form.get("courseId") as string) : "",
    vimeoUrl: typeof form.get("vimeoUrl") === "string" ? (form.get("vimeoUrl") as string) : "",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { courseId, vimeoUrl } = parsed.data;
  const vimeoId = extractVimeoId(vimeoUrl);

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, ownerId: true } });
  if (!course || (!teacher.isAdmin && course.ownerId !== teacher.id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    // Use raw SQL to be resilient to schema drift in dev (similar to addons).
    await prisma.$executeRawUnsafe('ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "previewVimeoId" TEXT;');
    await prisma.$executeRawUnsafe(
      'UPDATE "Course" SET "previewVimeoId" = $1 WHERE "id" = $2',
      vimeoId,
      courseId
    );
  } catch (e: any) {
    console.error("[api/admin/courses/update-preview-video] failed:", { courseId, vimeoUrl, vimeoId, e, code: e?.code, message: e?.message });
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, previewVimeoId: vimeoId });
}


