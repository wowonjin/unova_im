import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { slugify } from "@/lib/slugify";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { ensureDir, getStorageRoot } from "@/lib/storage";

export const runtime = "nodejs";

const Schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().transform((s) => (typeof s === "string" ? s.trim() : "")),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

async function ensureUniqueSlug(base: string) {
  const cleanBase = slugify(base) || "course";
  let attempt = cleanBase;
  for (let i = 0; i < 50; i++) {
    const exists = await prisma.course.findUnique({ where: { slug: attempt }, select: { id: true } });
    if (!exists) return attempt;
    attempt = `${cleanBase}-${i + 2}`;
  }
  // fallback (극단 케이스)
  return `${cleanBase}-${Date.now()}`;
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const raw = {
    title: form.get("title"),
    description: form.get("description"),
    isPublished: form.get("isPublished"),
    thumbnail: form.get("thumbnail"),
  };

  const parsed = Schema.safeParse({
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
    isPublished: typeof raw.isPublished === "string" ? raw.isPublished : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const title = parsed.data.title.trim();
  const slug = await ensureUniqueSlug(title);

  const course = await prisma.course.create({
    data: {
      ownerId: teacher.id,
      title,
      slug,
      description: parsed.data.description?.length ? parsed.data.description : null,
      thumbnailUrl: null,
      isPublished: parsed.data.isPublished,
    },
    select: { id: true, slug: true },
  });

  // 썸네일 파일(선택)
  const thumbnailFile =
    raw.thumbnail instanceof File && (raw.thumbnail.size ?? 0) > 0 && (raw.thumbnail.name ?? "").trim().length
      ? raw.thumbnail
      : null;

  if (thumbnailFile) {
    try {
      const bytes = Buffer.from(await thumbnailFile.arrayBuffer());
      const ext = path.extname(thumbnailFile.name || "").slice(0, 10);
      const dir = path.join(getStorageRoot(), "course-thumbnails", course.id);
      await ensureDir(dir);
      const storedName = `${crypto.randomUUID()}${ext || ""}`;
      const relPath = path.join("course-thumbnails", course.id, storedName).replace(/\\/g, "/");
      const fullPath = path.join(dir, storedName);
      await fs.writeFile(fullPath, bytes);

      await prisma.course.update({
        where: { id: course.id },
        data: {
          thumbnailStoredPath: relPath,
          thumbnailOriginalName: thumbnailFile.name || null,
          thumbnailMimeType: thumbnailFile.type || "application/octet-stream",
          thumbnailSizeBytes: bytes.length,
        },
      });
    } catch (e) {
      // On serverless environments, local filesystem storage may be unavailable.
      // Course creation should still succeed even if thumbnail persistence fails.
      console.error("[admin/courses/create] failed to persist thumbnail:", e);
    }
  }

  return NextResponse.redirect(new URL(`/admin/course/${course.id}`, req.url));
}


