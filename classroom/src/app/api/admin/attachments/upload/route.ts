import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { getBaseUrl } from "@/lib/oauth";
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

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function inferOriginalNameFromUrl(v: string) {
  try {
    const u = new URL(v);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const name = decodeURIComponent(last);
    return name || "자료";
  } catch {
    return "자료";
  }
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const form = await req.formData();

  const file = form.get("file");
  const fileUrlRaw = form.get("fileUrl");
  const titleRaw = form.get("title");
  const courseIdRaw = form.get("courseId");
  const lessonIdRaw = form.get("lessonId");
  const fileUrl = typeof fileUrlRaw === "string" ? fileUrlRaw.trim() : "";
  const hasFile = file instanceof File;

  if (!hasFile && !fileUrl) {
    return NextResponse.json({ ok: false, error: "NO_FILE_OR_URL" }, { status: 400 });
  }
  if (fileUrl && !isHttpUrl(fileUrl)) {
    return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
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

  let storedPath = "";
  let originalName = "자료";
  let mimeType = "application/octet-stream";
  let sizeBytes = 0;

  if (fileUrl) {
    storedPath = fileUrl;
    originalName = inferOriginalNameFromUrl(fileUrl);
  } else if (file instanceof File) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name || "").slice(0, 10);
    const dir = path.join(getStorageRoot(), finalCourseId);
    await ensureDir(dir);
    const storedName = `${crypto.randomUUID()}${ext || ""}`;
    storedPath = path.join(finalCourseId, storedName).replace(/\\/g, "/");
    const fullPath = path.join(dir, storedName);
    await fs.writeFile(fullPath, bytes);
    originalName = file.name || "자료";
    mimeType = file.type || "application/octet-stream";
    sizeBytes = bytes.length;
  }

  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : originalName || "자료";

  await prisma.attachment.create({
    data: {
      courseId: lessonId ? null : finalCourseId,
      lessonId: lessonId ?? null,
      title,
      storedPath,
      originalName,
      mimeType,
      sizeBytes,
    },
  });

  // 업로드 후 뒤로
  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", getBaseUrl(req)));
}


