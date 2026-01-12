import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  const client = req.headers.get("x-unova-client") || "";
  return accept.includes("application/json") || client === "1";
}

function normalizeStoredPath(input: string): string {
  const t = (input ?? "").trim();
  if (!t) return "";
  if (t.toLowerCase().startsWith("gs://")) {
    // gs://bucket/path -> https://storage.googleapis.com/bucket/path
    return `https://storage.googleapis.com/${t.slice(5)}`;
  }
  return t;
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

    // Node 환경에서는 worker 없이 처리 (페이지 수만 필요)
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

const Schema = z.object({
  textbookId: z.string().min(1),
  storedPath: z
    .string()
    .optional()
    .transform((v) => (typeof v === "string" ? v : "")),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const referer = req.headers.get("referer") || "/admin/textbooks";
  const json = wantsJson(req);

  const form = await req.formData().catch(() => null);
  if (!form) {
    return json
      ? NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 })
      : NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  const parsed = Schema.safeParse({
    textbookId: form.get("textbookId"),
    storedPath: form.get("storedPath"),
  });
  if (!parsed.success) {
    return json
      ? NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 })
      : NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  const nextStoredPath = normalizeStoredPath(parsed.data.storedPath || "");
  if (!nextStoredPath) {
    // storedPath는 필수 필드라 빈 값 저장은 막습니다.
    return json
      ? NextResponse.json({ ok: false, error: "EMPTY_STORED_PATH" }, { status: 400 })
      : NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  // URL 또는 로컬 경로 모두 허용하되, URL이면 기본 형태 검증
  if (/^https?:\/\//i.test(nextStoredPath)) {
    try {
      new URL(nextStoredPath);
    } catch {
      return json
        ? NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 })
        : NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
  }

  // findUnique는 unique 필드만 허용 → ownerId 조건은 findFirst로
  const tb = await prisma.textbook.findFirst({
    where: { id: parsed.data.textbookId, ownerId: teacher.id },
    select: { id: true, storedPath: true, mimeType: true, sizeBytes: true, pageCount: true },
  });
  if (!tb) {
    return json
      ? NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
      : NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  const updateData: Record<string, unknown> = { storedPath: nextStoredPath };

  // === 페이지 수/용량 자동 연동 ===
  // - 외부 URL이면 HEAD로 size/mime을 갱신
  // - PDF로 판단되면 pageCount를 새로 계산해 저장
  const isHttp = /^https?:\/\//i.test(nextStoredPath);
  if (isHttp) {
    const head = await getUrlHeadInfo(nextStoredPath);
    const headType = (head.contentType || "").toLowerCase();
    const isPdfCandidate =
      headType.includes("application/pdf") || /\.pdf(\?|$)/i.test(nextStoredPath) || (tb.mimeType || "").toLowerCase().includes("application/pdf");

    if (head.sizeBytes > 0) updateData.sizeBytes = head.sizeBytes;
    if (head.contentType) updateData.mimeType = headType.includes("application/pdf") ? "application/pdf" : head.contentType;

    if (isPdfCandidate) {
      const pages = await getPdfPageCountFromUrl(nextStoredPath);
      updateData.pageCount = pages ?? null;
      // mimeType이 비어있거나 잘못된 경우 PDF로 맞춤
      if (!updateData.mimeType) updateData.mimeType = "application/pdf";
    } else {
      // PDF가 아니면 pageCount를 비웁니다(기존 값이 남아 잘못 보이는 것 방지)
      updateData.pageCount = null;
    }
  }

  try {
    // files 컬럼이 있으면 0번(대표) 파일도 함께 동기화
    try {
      const withFiles = await prisma.textbook.findUnique({ where: { id: tb.id }, select: { id: true, files: true } });
      const list = Array.isArray((withFiles as any)?.files) ? (((withFiles as any).files) as any[]) : null;
      if (list && list.length > 0 && list[0] && typeof list[0] === "object") {
        const next = list.slice();
        next[0] = {
          ...next[0],
          storedPath: updateData.storedPath,
          ...(typeof updateData.mimeType === "string" ? { mimeType: updateData.mimeType } : null),
          ...(typeof updateData.sizeBytes === "number" ? { sizeBytes: updateData.sizeBytes } : null),
          ...(updateData.pageCount !== undefined ? { pageCount: updateData.pageCount } : null),
        };
        await prisma.textbook.update({
          where: { id: tb.id },
          data: ({ ...updateData, files: next as any } as any),
          select: { id: true },
        });
      } else {
        await prisma.textbook.update({
          where: { id: tb.id },
          data: updateData as any,
          select: { id: true },
        });
      }
    } catch {
      // files 컬럼이 없거나 select 실패 → 기존 업데이트만 수행
      await prisma.textbook.update({
        where: { id: tb.id },
        data: updateData as any,
        select: { id: true },
      });
    }
  } catch (e) {
    // 운영/배포에서 컬럼 누락 등으로 실패할 수 있어 최소 업데이트로 재시도
    await prisma.textbook.update({
      where: { id: tb.id },
      data: { storedPath: nextStoredPath } as never,
      select: { id: true },
    });
  }

  if (json) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL(`${referer}?saved=ok`, req.url));
}

