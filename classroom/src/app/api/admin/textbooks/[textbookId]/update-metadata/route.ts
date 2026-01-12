import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseFileIndex(req: Request): number | null {
  try {
    const u = new URL(req.url);
    const raw = u.searchParams.get("file");
    if (raw == null || raw.trim() === "") return null;
    if (!/^\d+$/.test(raw.trim())) return null;
    const n = parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
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
  } catch (e) {
    console.error("[update-metadata] Failed to read HEAD:", e);
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
    console.error("[update-metadata] Failed to get PDF page count:", e);
    return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ textbookId: string }> }) {
  const teacher = await requireAdminUser();
  const { textbookId } = await params;
  const referer = req.headers.get("referer") || "/admin/textbooks";
  const fileIndex = parseFileIndex(req);

  const redirectTo = (status: "ok" | "error" | "skipped") => {
    // referer가 이미 query를 포함할 수 있어 URLSearchParams로 안전하게 합칩니다.
    const u = new URL(referer, req.url);
    u.searchParams.set("updated", status);
    return NextResponse.redirect(u);
  };

  // 운영/로컬 환경에서 Prisma Client 생성본이 스키마/마이그레이션과 불일치할 수 있어
  // pageCount 같은 필드 select에서 바로 500이 나지 않도록 폴백 처리합니다.
  let tb:
    | { id: string; storedPath: string; mimeType: string; sizeBytes: number; pageCount?: number | null; files?: unknown }
    | null = null;
  try {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: { id: true, storedPath: true, mimeType: true, sizeBytes: true, pageCount: true, files: true },
    });
  } catch {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: { id: true, storedPath: true, mimeType: true, sizeBytes: true },
    });
  }

  if (!tb) return redirectTo("error");

  // 다중 파일 지원: fileIndex가 있으면 files[fileIndex]를 대상으로 갱신
  let targetStoredPath = tb.storedPath;
  let targetMimeType = tb.mimeType;
  let targetPageCount = (tb as any).pageCount ?? null;

  const files = Array.isArray((tb as any).files) ? ((tb as any).files as any[]) : null;
  if (fileIndex != null && files && files.length > 0) {
    const f = files[fileIndex];
    if (!f || typeof f !== "object") return redirectTo("error");
    if (typeof f.storedPath === "string" && f.storedPath) targetStoredPath = f.storedPath;
    if (typeof f.mimeType === "string" && f.mimeType) targetMimeType = f.mimeType;
    const pc = Number(f.pageCount);
    targetPageCount = Number.isFinite(pc) && pc > 0 ? pc : null;
  }

  // 외부 URL인 경우만 갱신(로컬 파일은 기존 로직 유지)
  if (!/^https?:\/\//i.test(targetStoredPath)) {
    return redirectTo("skipped");
  }

  const head = await getUrlHeadInfo(targetStoredPath);
  const headType = head.contentType?.toLowerCase() ?? "";
  const isPdfCandidate =
    headType.includes("application/pdf") ||
    (targetMimeType || "").toLowerCase().includes("application/pdf") ||
    /\.pdf(\?|$)/i.test(targetStoredPath);
  const nextMimeType = headType.includes("application/pdf") ? "application/pdf" : targetMimeType;

  const next: Record<string, unknown> = {};
  if (head.sizeBytes > 0) next.sizeBytes = head.sizeBytes;
  if (nextMimeType && nextMimeType !== targetMimeType) next.mimeType = nextMimeType;

  // pageCount가 비어있을 때만 채움(원하면 여기서 항상 재계산하도록 바꿀 수 있음)
  if (isPdfCandidate && !(targetPageCount && targetPageCount > 0)) {
    const pages = await getPdfPageCountFromUrl(targetStoredPath);
    if (pages && pages > 0) next.pageCount = pages;
  }

  if (Object.keys(next).length > 0) {
    try {
      // fileIndex 지정 + files 컬럼 존재 시: files[fileIndex]도 함께 갱신
      if (fileIndex != null && files && files.length > 0) {
        const updatedFiles = files.slice();
        const prev = updatedFiles[fileIndex];
        if (!prev || typeof prev !== "object") return redirectTo("error");
        updatedFiles[fileIndex] = {
          ...prev,
          ...(typeof next.sizeBytes === "number" ? { sizeBytes: next.sizeBytes } : null),
          ...(typeof next.mimeType === "string" ? { mimeType: next.mimeType } : null),
          ...(next.pageCount !== undefined ? { pageCount: next.pageCount } : null),
        };

        // 대표 파일(0번)인 경우: 기존 컬럼도 함께 갱신
        if (fileIndex === 0) {
          await prisma.textbook.update({ where: { id: tb.id }, data: { ...(next as never), files: updatedFiles as any } });
        } else {
          await prisma.textbook.update({ where: { id: tb.id }, data: { files: updatedFiles as any } });
        }
      } else {
      await prisma.textbook.update({ where: { id: tb.id }, data: next as never });
      }
    } catch (e) {
      // 마이그레이션 미적용 등으로 컬럼이 없을 수 있음 → sizeBytes만이라도 시도
      console.error("[update-metadata] textbook.update failed, retrying minimal:", e);
      const minimal: Record<string, unknown> = {};
      if (typeof next.sizeBytes === "number") minimal.sizeBytes = next.sizeBytes;
      if (typeof next.mimeType === "string") minimal.mimeType = next.mimeType;
      if (Object.keys(minimal).length > 0) {
        await prisma.textbook.update({ where: { id: tb.id }, data: minimal as never });
      }
    }
  }

  return redirectTo("ok");
}

