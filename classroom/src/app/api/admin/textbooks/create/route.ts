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

async function getFileSizeFromUrl(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    }
  } catch (e) {
    console.error("[getFileSizeFromUrl] Failed to get file size:", e);
  }
  return 0;
}

async function createTextbookSafe(data: Record<string, unknown>) {
  try {
    await prisma.textbook.create({ data: data as never });
    return;
  } catch (e) {
    console.error("[admin/textbooks/create] prisma.textbook.create failed, retrying with minimal fields:", e);
  }

  // 마이그레이션 누락 등으로 일부 컬럼이 없을 때를 대비해 최소 필드로 재시도
  try {
    const minimal = {
      ownerId: data.ownerId,
      title: data.title,
      storedPath: data.storedPath,
      originalName: data.originalName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      isPublished: data.isPublished ?? true,
    };
    await prisma.textbook.create({ data: minimal as never });
  } catch (e) {
    console.error("[admin/textbooks/create] prisma.textbook.create minimal retry failed:", e);
    const minimal2 = {
      ownerId: data.ownerId,
      title: data.title,
      storedPath: data.storedPath,
      originalName: data.originalName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    };
    await prisma.textbook.create({ data: minimal2 as never });
  }
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const urlRaw = form.get("url");
  const titleRaw = form.get("title");
  const teacherNameRaw = form.get("teacherName");
  const subjectNameRaw = form.get("subjectName");
  const isPublishedRaw = form.get("isPublished");
  const entitlementDaysRaw = form.get("entitlementDays");
  const imwebProdCodeRaw = form.get("imwebProdCode");

  const isPublished =
    typeof isPublishedRaw === "string" ? isPublishedRaw === "1" || isPublishedRaw === "true" || isPublishedRaw === "on" : true;
  const entitlementDays =
    typeof entitlementDaysRaw === "string" && /^\d+$/.test(entitlementDaysRaw.trim())
      ? Math.max(1, Math.min(3650, parseInt(entitlementDaysRaw.trim(), 10)))
      : 30;
  const imwebProdCode = typeof imwebProdCodeRaw === "string" && imwebProdCodeRaw.trim().length > 0 ? imwebProdCodeRaw.trim() : null;
  const teacherName = typeof teacherNameRaw === "string" && teacherNameRaw.trim().length > 0 ? teacherNameRaw.trim() : null;
  const subjectName = typeof subjectNameRaw === "string" && subjectNameRaw.trim().length > 0 ? subjectNameRaw.trim() : null;

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
    const title = typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : inferredName || "교재";
    const originalName = inferredName || title;
    const mimeType = originalName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";

    // URL에서 파일 크기 가져오기
    const sizeBytes = await getFileSizeFromUrl(url);

    await createTextbookSafe({
      ownerId: teacher.id,
      title,
      teacherName,
      subjectName,
      // storedPath 컬럼을 외부 URL 저장용으로도 재사용(다운로드 라우트에서 http(s)면 redirect 처리)
      storedPath: url,
      originalName,
      mimeType,
      sizeBytes,
      isPublished,
      entitlementDays,
      imwebProdCode,
    });

    return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
  }

  // 기존 파일 업로드 방식(호환 유지)
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "NO_URL_OR_FILE" }, { status: 400 });
  }

  const title = typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : file.name || "교재";

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "").slice(0, 12);

  const dir = path.join(getStorageRoot(), "textbooks", teacher.id);
  await ensureDir(dir);

  const storedName = `${crypto.randomUUID()}${ext || ""}`;
  const storedPath = path.join("textbooks", teacher.id, storedName).replace(/\\/g, "/");
  const fullPath = path.join(dir, storedName);
  await fs.writeFile(fullPath, bytes);

  await createTextbookSafe({
    ownerId: teacher.id,
    title,
    teacherName,
    subjectName,
    storedPath,
    originalName: file.name || title,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: bytes.length,
    isPublished,
    entitlementDays,
    imwebProdCode,
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}


