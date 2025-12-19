import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { ensureDir, getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
});

function getThumbDir(courseId: string) {
  return path.join(getStorageRoot(), "course-thumbnails", courseId);
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: typeof form.get("courseId") === "string" ? form.get("courseId") : "",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const file = form.get("thumbnail");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true, thumbnailStoredPath: true },
  });
  if (!course) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });
  if (course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "").slice(0, 10);
  const dir = getThumbDir(course.id);
  await ensureDir(dir);
  const storedName = `${crypto.randomUUID()}${ext || ""}`;
  const relPath = path.join("course-thumbnails", course.id, storedName).replace(/\\/g, "/");
  const fullPath = path.join(dir, storedName);

  await fs.writeFile(fullPath, bytes);

  // 기존 썸네일 파일 제거(실패해도 무시)
  if (course.thumbnailStoredPath) {
    try {
      const oldFull = safeJoin(getStorageRoot(), course.thumbnailStoredPath);
      await fs.unlink(oldFull);
    } catch {
      // ignore
    }
  }

  await prisma.course.update({
    where: { id: course.id },
    data: {
      thumbnailUrl: null,
      thumbnailStoredPath: relPath,
      thumbnailOriginalName: file.name || null,
      thumbnailMimeType: file.type || "application/octet-stream",
      thumbnailSizeBytes: bytes.length,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || `/admin/course/${course.id}?tab=settings`, req.url));
}


