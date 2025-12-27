import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  relatedTextbookIds: z.string().optional().transform((s) => {
    try {
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  }),
  relatedCourseIds: z.string().optional().transform((s) => {
    try {
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  }),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const data: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") data[k] = v;
  }

  const parsed = Schema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { courseId, relatedTextbookIds, relatedCourseIds } = parsed.data;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, ownerId: true } });
  if (!course || (!teacher.isAdmin && course.ownerId !== teacher.id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    await prisma.course.update({
      where: { id: courseId },
      data: { relatedTextbookIds, relatedCourseIds } as never,
    });
  } catch (e: any) {
    // Help debug "저장 중 오류" from client
    console.error("[api/admin/courses/update-addons] update failed:", {
      courseId,
      relatedTextbookIdsCount: Array.isArray(relatedTextbookIds) ? relatedTextbookIds.length : null,
      relatedCourseIdsCount: Array.isArray(relatedCourseIds) ? relatedCourseIds.length : null,
      error: e,
      message: e?.message,
      code: e?.code,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "UPDATE_FAILED",
        message: typeof e?.message === "string" ? e.message : "UNKNOWN_ERROR",
        code: e?.code ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}


