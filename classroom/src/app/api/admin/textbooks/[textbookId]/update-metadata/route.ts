import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

  const redirectTo = (status: "ok" | "error" | "skipped") => {
    // referer가 이미 query를 포함할 수 있어 URLSearchParams로 안전하게 합칩니다.
    const u = new URL(referer, req.url);
    u.searchParams.set("updated", status);
    return NextResponse.redirect(u);
  };

  // 운영/로컬 환경에서 Prisma Client 생성본이 스키마/마이그레이션과 불일치할 수 있어
  // pageCount 같은 필드 select에서 바로 500이 나지 않도록 폴백 처리합니다.
  let tb: { id: string; storedPath: string; mimeType: string; sizeBytes: number; pageCount?: number | null } | null = null;
  try {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: { id: true, storedPath: true, mimeType: true, sizeBytes: true, pageCount: true },
    });
  } catch {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: { id: true, storedPath: true, mimeType: true, sizeBytes: true },
    });
  }

  if (!tb) return redirectTo("error");

  // 외부 URL인 경우만 갱신(로컬 파일은 기존 로직 유지)
  if (!/^https?:\/\//i.test(tb.storedPath)) {
    return redirectTo("skipped");
  }

  const head = await getUrlHeadInfo(tb.storedPath);
  const headType = head.contentType?.toLowerCase() ?? "";
  const isPdfCandidate =
    headType.includes("application/pdf") ||
    (tb.mimeType || "").toLowerCase().includes("application/pdf") ||
    /\.pdf(\?|$)/i.test(tb.storedPath);
  const nextMimeType = headType.includes("application/pdf") ? "application/pdf" : tb.mimeType;

  const next: Record<string, unknown> = {};
  if (head.sizeBytes > 0) next.sizeBytes = head.sizeBytes;
  if (nextMimeType && nextMimeType !== tb.mimeType) next.mimeType = nextMimeType;

  // pageCount가 비어있을 때만 채움(원하면 여기서 항상 재계산하도록 바꿀 수 있음)
  if (isPdfCandidate && !(tb.pageCount && tb.pageCount > 0)) {
    const pages = await getPdfPageCountFromUrl(tb.storedPath);
    if (pages && pages > 0) next.pageCount = pages;
  }

  if (Object.keys(next).length > 0) {
    try {
      await prisma.textbook.update({ where: { id: tb.id }, data: next as never });
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

