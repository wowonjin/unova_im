import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const ParamsSchema = z.object({ attachmentId: z.string().min(1) });

function getStorageRoot() {
  return path.resolve(process.cwd(), "storage");
}

function safeJoin(root: string, rel: string) {
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) throw new Error("INVALID_PATH");
  return resolved;
}

export async function POST(req: Request, ctx: { params: Promise<{ attachmentId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { attachmentId } = ParamsSchema.parse(await ctx.params);

  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, storedPath: true, courseId: true, lessonId: true, lesson: { select: { courseId: true } } },
  });
  if (!att) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const courseId = att.courseId ?? att.lesson?.courseId ?? null;
  if (!courseId) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { ownerId: true } });
  if (!course || course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 먼저 DB 삭제(참조 무결성)
  await prisma.attachment.delete({ where: { id: attachmentId } });

  // 파일 삭제는 실패해도 UX를 막지 않음(파일이 이미 없을 수 있음)
  try {
    const filePath = safeJoin(getStorageRoot(), att.storedPath);
    await fs.unlink(filePath);
  } catch {
    // ignore
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


