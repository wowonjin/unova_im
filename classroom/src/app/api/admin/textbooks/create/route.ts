import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { ensureDir, getStorageRoot } from "@/lib/storage";

export const runtime = "nodejs";

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

function guessFileNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last) || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const urlRaw = form.get("url");
  const titleRaw = form.get("title");
  const isPublishedRaw = form.get("isPublished");
  const entitlementDaysRaw = form.get("entitlementDays");

  const isPublished = typeof isPublishedRaw === "string" ? isPublishedRaw === "1" || isPublishedRaw === "true" || isPublishedRaw === "on" : true;
  const entitlementDays = typeof entitlementDaysRaw === "string" && /^\d+$/.test(entitlementDaysRaw.trim())
    ? Math.max(1, Math.min(3650, parseInt(entitlementDaysRaw.trim(), 10)))
    : 365;

  // URL 방식(구글 콘솔/GCS 등)
  if (typeof urlRaw === "string" && urlRaw.trim().length > 0) {
    const url = urlRaw.trim();
    if (!isHttpUrl(url)) return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
    // URL 자체가 유효한 형태인지 확인
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
    }

    const inferredName = guessFileNameFromUrl(url);
    const title =
      typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : inferredName || "교재";
    const originalName = inferredName || title;
    const mimeType = originalName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";

    await prisma.textbook.create({
      data: {
        ownerId: teacher.id,
        title,
        // storedPath 컬럼을 외부 URL 저장용으로도 재사용(다운로드 라우트에서 http(s)면 redirect 처리)
        storedPath: url,
        originalName,
        mimeType,
        sizeBytes: 0,
        isPublished,
        entitlementDays,
      },
    });

    return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
  }

  // 기존 파일 업로드 방식(호환 유지)
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "NO_URL_OR_FILE" }, { status: 400 });
  }

  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : file.name || "교재";

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "").slice(0, 12);

  const dir = path.join(getStorageRoot(), "textbooks", teacher.id);
  await ensureDir(dir);

  const storedName = `${crypto.randomUUID()}${ext || ""}`;
  const storedPath = path.join("textbooks", teacher.id, storedName).replace(/\\/g, "/");
  const fullPath = path.join(dir, storedName);
  await fs.writeFile(fullPath, bytes);

  await prisma.textbook.create({
    data: {
      ownerId: teacher.id,
      title,
      storedPath,
      originalName: file.name || title,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: bytes.length,
      isPublished,
      entitlementDays,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}


