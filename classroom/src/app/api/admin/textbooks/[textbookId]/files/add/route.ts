import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { ensureDir, getStorageRoot } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

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

async function getUrlHeadInfo(url: string): Promise<{ sizeBytes: number; contentType: string | null }> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return { sizeBytes: 0, contentType: null };
    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");
    return {
      sizeBytes: contentLength ? parseInt(contentLength, 10) : 0,
      contentType: contentType || null,
    };
  } catch {
    return { sizeBytes: 0, contentType: null };
  }
}

async function getPdfPageCountFromUrl(url: string): Promise<number | null> {
  try {
    const mod: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const lib: any = mod?.default ?? mod;
    if (!lib?.getDocument) return null;

    const task = lib.getDocument({ url, disableWorker: true });
    try {
      const pdf = await task.promise;
      const pages = Number(pdf?.numPages ?? 0);
      return Number.isFinite(pages) && pages > 0 ? pages : null;
    } finally {
      try {
        task.destroy?.();
      } catch {
        // ignore
      }
    }
  } catch {
    return null;
  }
}

async function getPdfPageCountFromBytes(bytes: Buffer): Promise<number | null> {
  try {
    const mod: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const lib: any = mod?.default ?? mod;
    if (!lib?.getDocument) return null;

    const task = lib.getDocument({ data: new Uint8Array(bytes), disableWorker: true });
    try {
      const pdf = await task.promise;
      const pages = Number(pdf?.numPages ?? 0);
      return Number.isFinite(pages) && pages > 0 ? pages : null;
    } finally {
      try {
        task.destroy?.();
      } catch {
        // ignore
      }
    }
  } catch {
    return null;
  }
}

type TextbookFileItem = {
  storedPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
};

function normalizeExistingFiles(tb: { storedPath: string; originalName: string; mimeType: string; sizeBytes: number; pageCount?: number | null; files?: unknown }) {
  const list = Array.isArray((tb as any).files) ? ((tb as any).files as any[]) : [];
  const normalized: TextbookFileItem[] = [];
  for (const f of list) {
    if (!f || typeof f !== "object") continue;
    const storedPath = typeof f.storedPath === "string" ? f.storedPath : "";
    const originalName = typeof f.originalName === "string" ? f.originalName : "";
    const mimeType = typeof f.mimeType === "string" ? f.mimeType : "application/octet-stream";
    const sizeBytes = Number(f.sizeBytes);
    const pageCount = Number(f.pageCount);
    if (!storedPath || !originalName || !Number.isFinite(sizeBytes)) continue;
    normalized.push({
      storedPath,
      originalName,
      mimeType,
      sizeBytes: Math.max(0, Math.floor(sizeBytes)),
      pageCount: Number.isFinite(pageCount) && pageCount > 0 ? Math.floor(pageCount) : null,
    });
  }

  // 백워드 호환: 기존 단일 파일(storedPath)을 첫 항목으로 포함
  if (!normalized.some((x) => x.storedPath === tb.storedPath)) {
    normalized.unshift({
      storedPath: tb.storedPath,
      originalName: tb.originalName,
      mimeType: tb.mimeType,
      sizeBytes: tb.sizeBytes,
      pageCount: (tb as any).pageCount ?? null,
    });
  }

  return normalized;
}

export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await requireAdminUser();
  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const form = await req.formData();
  const urlRaw = form.get("url");
  const titleRaw = form.get("title");

  const urls =
    typeof urlRaw === "string" && urlRaw.trim().length > 0
      ? urlRaw
          .split(/\r?\n|,/g)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const files = form
    .getAll("file")
    .filter((v): v is File => v instanceof File && (v.size ?? 0) > 0);

  if (urls.length === 0 && files.length === 0) {
    return NextResponse.json({ ok: false, error: "NO_INPUT" }, { status: 400 });
  }

  // 교재 소유권 + 현재 파일 정보 로드 (files 컬럼이 없으면 에러 → 폴백)
  let tb:
    | { id: string; ownerId: string; title: string; storedPath: string; originalName: string; mimeType: string; sizeBytes: number; pageCount?: number | null; files?: unknown }
    | null = null;

  try {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true, ownerId: true, title: true, storedPath: true, originalName: true, mimeType: true, sizeBytes: true, pageCount: true, files: true },
    });
  } catch {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true, ownerId: true, title: true, storedPath: true, originalName: true, mimeType: true, sizeBytes: true, pageCount: true },
    });
  }

  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const baseTitle = typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : null;
  const existing = normalizeExistingFiles(tb);
  const next = existing.slice();

  // URL 추가
  const MAX_BULK = 50;
  for (let i = 0; i < Math.min(urls.length, MAX_BULK); i += 1) {
    const url = urls[i];
    if (!isHttpUrl(url)) return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
    }

    const inferredName = guessFileNameFromUrl(url) || "교재.pdf";
    const guessedMimeType = inferredName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
    const head = await getUrlHeadInfo(url);
    const headType = head.contentType?.toLowerCase() ?? "";
    const isPdfCandidate = headType.includes("application/pdf") || guessedMimeType === "application/pdf" || /\.pdf(\?|$)/i.test(url);
    const mimeType = headType.includes("application/pdf") ? "application/pdf" : head.contentType || (isPdfCandidate ? "application/pdf" : guessedMimeType);
    const sizeBytes = head.sizeBytes || 0;
    const pageCount = isPdfCandidate ? await getPdfPageCountFromUrl(url) : null;

    const originalName = inferredName;
    // UI 표시용 이름은 baseTitle이 들어오면 suffix로 보정하되, 저장은 originalName 기준
    void baseTitle;

    next.push({
      storedPath: url,
      originalName,
      mimeType,
      sizeBytes,
      pageCount,
    });
  }

  // 파일 업로드 추가 (로컬 저장)
  if (files.length > 0) {
    const dir = path.join(getStorageRoot(), "textbooks", teacher.id);
    await ensureDir(dir);

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name || "").slice(0, 12);
      const storedName = `${crypto.randomUUID()}${ext || ""}`;
      const storedPath = path.join("textbooks", teacher.id, storedName).replace(/\\/g, "/");
      const fullPath = path.join(dir, storedName);
      await fs.writeFile(fullPath, bytes);

      const mimeType = file.type || (String(ext).toLowerCase() === ".pdf" ? "application/pdf" : "application/octet-stream");
      const pageCount = mimeType.includes("pdf") ? await getPdfPageCountFromBytes(bytes) : null;

      next.push({
        storedPath,
        originalName: file.name || storedName,
        mimeType,
        sizeBytes: bytes.length,
        pageCount,
      });
    }
  }

  // files 컬럼이 실제 DB에 없으면 update가 실패할 수 있음 → 명확한 에러를 반환
  try {
    await prisma.textbook.update({
      where: { id: tb.id },
      data: { files: next as any },
    });
  } catch (e) {
    console.error("[admin/textbooks/files/add] textbook.update(files) failed:", e);
    return NextResponse.json({ ok: false, error: "DB_SCHEMA_MISMATCH" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/admin/textbook/${tb.id}?tab=settings`, req.url));
}

