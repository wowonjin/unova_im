import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

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
  } catch (e) {
    console.error("[refresh-metadata] Failed to read HEAD:", e);
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
  } catch (e) {
    console.error("[refresh-metadata] Failed to get PDF page count:", e);
    return null;
  }
}

/**
 * POST /api/admin/textbooks/[textbookId]/refresh-metadata
 * - 관리자 전용
 * - 대표 파일(0번)의 sizeBytes/mimeType/pageCount를 다시 계산해 DB에 반영
 * - 리스트(교재 DB)에서 "정보 다시 불러오기" 버튼용
 */
export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await requireAdminUser();
  const { textbookId } = ParamsSchema.parse(await ctx.params);

  // 운영/로컬 환경에서 Prisma 스키마 불일치 가능 → select 폴백
  let tb:
    | { id: string; ownerId: string; storedPath: string; mimeType: string; sizeBytes: number; pageCount?: number | null; files?: unknown }
    | null = null;
  try {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true, ownerId: true, storedPath: true, mimeType: true, sizeBytes: true, pageCount: true, files: true },
    });
  } catch {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true, ownerId: true, storedPath: true, mimeType: true, sizeBytes: true },
    });
  }

  if (!tb || tb.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 대표 파일(0번)을 갱신 대상으로 사용
  let targetStoredPath = tb.storedPath;
  let targetMimeType = tb.mimeType;
  const files = Array.isArray((tb as any).files) ? (((tb as any).files) as any[]) : null;
  if (files && files.length > 0 && files[0] && typeof files[0] === "object") {
    const f0 = files[0];
    if (typeof f0.storedPath === "string" && f0.storedPath) targetStoredPath = f0.storedPath;
    if (typeof f0.mimeType === "string" && f0.mimeType) targetMimeType = f0.mimeType;
  }

  if (!/^https?:\/\//i.test(targetStoredPath)) {
    return NextResponse.json({ ok: true, updated: false, skipped: true });
  }

  const head = await getUrlHeadInfo(targetStoredPath);
  const headType = head.contentType?.toLowerCase() ?? "";
  const isPdfCandidate =
    headType.includes("application/pdf") ||
    (targetMimeType || "").toLowerCase().includes("application/pdf") ||
    /\.pdf(\?|$)/i.test(targetStoredPath);

  const nextMimeType = headType.includes("application/pdf") ? "application/pdf" : targetMimeType;
  const pages = isPdfCandidate ? await getPdfPageCountFromUrl(targetStoredPath) : null;

  const next: Record<string, unknown> = {};
  if (head.sizeBytes > 0) next.sizeBytes = head.sizeBytes;
  if (nextMimeType && nextMimeType !== targetMimeType) next.mimeType = nextMimeType;
  // "다시 불러오기"는 항상 최신 값을 목표로 하므로 pageCount는 매번 갱신 시도
  if (isPdfCandidate) next.pageCount = pages;

  if (Object.keys(next).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  try {
    // files 컬럼이 있으면 대표 파일(0번)도 함께 동기화
    if (files && files.length > 0 && files[0] && typeof files[0] === "object") {
      const updatedFiles = files.slice();
      updatedFiles[0] = {
        ...updatedFiles[0],
        ...(typeof next.sizeBytes === "number" ? { sizeBytes: next.sizeBytes } : null),
        ...(typeof next.mimeType === "string" ? { mimeType: next.mimeType } : null),
        ...(next.pageCount !== undefined ? { pageCount: next.pageCount } : null),
      };
      const updateData: any = { ...next, files: updatedFiles as any };
      await prisma.textbook.update({ where: { id: tb.id }, data: updateData });
    } else {
      await prisma.textbook.update({ where: { id: tb.id }, data: next as any });
    }
  } catch (e) {
    console.error("[refresh-metadata] textbook.update failed:", e);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: true,
    sizeBytes: typeof next.sizeBytes === "number" ? next.sizeBytes : null,
    pageCount: next.pageCount !== undefined ? (next.pageCount as number | null) : null,
  });
}

