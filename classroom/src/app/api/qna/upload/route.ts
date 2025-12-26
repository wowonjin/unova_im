import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

function getStorageRoot() {
  return path.resolve(process.cwd(), "storage");
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

const MetaSchema = z.object({
  lessonId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const form = await req.formData();

  const file = form.get("file");
  const lessonId = form.get("lessonId");
  const meta = MetaSchema.safeParse({ lessonId });
  if (!meta.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ ok: false, error: "NOT_IMAGE" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });

  // 접근 가능한 강의인지 확인
  const lesson = await prisma.lesson.findUnique({
    where: { id: meta.data.lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });

  if (!user.isAdmin && !bypassEnrollment) {
    const now = new Date();
    const ok = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: lesson.courseId, status: "ACTIVE", endAt: { gt: now } },
      select: { id: true },
    });
    if (!ok) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const ext = path.extname(file.name || "").slice(0, 10) || ".png";
  const dir = path.join(getStorageRoot(), lesson.courseId, "qna");
  await ensureDir(dir);
  const storedName = `${crypto.randomUUID()}${ext}`;
  const storedPath = path.join(lesson.courseId, "qna", storedName).replace(/\\/g, "/");
  const fullPath = path.join(dir, storedName);
  await fs.writeFile(fullPath, bytes);

  const att = await prisma.attachment.create({
    data: {
      courseId: null,
      lessonId: lesson.id,
      title: "Q&A 이미지",
      storedPath,
      originalName: file.name || "image",
      mimeType: file.type || "application/octet-stream",
      sizeBytes: bytes.length,
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    attachmentId: att.id,
    // 이미지 표시용(인라인)
    url: `/api/attachments/${att.id}/view`,
  });
}


