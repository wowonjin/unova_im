import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const runtime = "nodejs";

function getStorageRoot() {
  return path.resolve(process.cwd(), "storage");
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const form = await req.formData();

  const file = form.get("file");
  const titleRaw = form.get("title");
  const courseIdRaw = form.get("courseId");
  const lessonIdRaw = form.get("lessonId");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
  }

  const courseId = typeof courseIdRaw === "string" && courseIdRaw ? courseIdRaw : null;
  const lessonId = typeof lessonIdRaw === "string" && lessonIdRaw ? lessonIdRaw : null;
  if (!courseId && !lessonId) {
    return NextResponse.json({ ok: false, error: "MISSING_TARGET" }, { status: 400 });
  }

  // lessonId가 있으면 courseId는 DB로부터 보정
  let finalCourseId = courseId;
  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { courseId: true, course: { select: { ownerId: true } } },
    });
    if (!lesson) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });
    if (lesson.course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });
    finalCourseId = lesson.courseId;
  }
  if (!finalCourseId) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const course = await prisma.course.findUnique({ where: { id: finalCourseId }, select: { ownerId: true } });
  if (!course || course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "").slice(0, 10);
  const dir = path.join(getStorageRoot(), finalCourseId);
  await ensureDir(dir);
  const storedName = `${crypto.randomUUID()}${ext || ""}`;
  const storedPath = path.join(finalCourseId, storedName).replace(/\\/g, "/");
  const fullPath = path.join(dir, storedName);
  await fs.writeFile(fullPath, bytes);

  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : file.name || "자료";

  await prisma.attachment.create({
    data: {
      courseId: lessonId ? null : finalCourseId,
      lessonId: lessonId ?? null,
      title,
      storedPath,
      originalName: file.name || title,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: bytes.length,
    },
  });

  // 업로드 후 뒤로
  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


