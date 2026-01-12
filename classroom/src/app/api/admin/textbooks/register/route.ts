import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  const client = req.headers.get("x-unova-client") || "";
  return accept.includes("application/json") || client === "1";
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

function isGoogleStorageUrl(url: string) {
  const raw = url.trim();
  if (!isHttpUrl(raw)) return false;
  try {
    const u = new URL(raw);
    const h = (u.hostname || "").toLowerCase();
    return (
      h === "storage.googleapis.com" ||
      h.endsWith(".storage.googleapis.com") ||
      h === "storage.cloud.google.com" ||
      h.endsWith(".storage.cloud.google.com")
    );
  } catch {
    return false;
  }
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

function guessTitleFromUrl(url: string): string | null {
  const inferred = guessFileNameFromUrl(url);
  if (!inferred) return null;
  // remove extension
  const noExt = inferred.replace(/\.[a-z0-9]{1,8}(\?|$)/i, "").trim();
  const pretty = noExt.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  return pretty || null;
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

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const json = wantsJson(req);

  const form = await req.formData();
  const titleRaw = form.get("title");
  const urlRaw = form.get("url");
  const thumbnailDataUrlRaw = form.get("thumbnailDataUrl");
  const pageCountRaw = form.get("pageCount");
  const entitlementDaysRaw = form.get("entitlementDays");
  const isPublishedRaw = form.get("isPublished");

  let title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const urlText = typeof urlRaw === "string" ? urlRaw.trim() : "";
  const thumbnailDataUrl =
    typeof thumbnailDataUrlRaw === "string" && thumbnailDataUrlRaw.trim().length > 0 ? thumbnailDataUrlRaw.trim() : null;

  // data URL은 너무 커지면 DB/응답/프록시 등에 부담 → 상한을 둡니다.
  const safeThumbnailDataUrl =
    thumbnailDataUrl && thumbnailDataUrl.length <= 500_000 && thumbnailDataUrl.startsWith("data:image/")
      ? thumbnailDataUrl
      : null;

  const clientPageCount =
    typeof pageCountRaw === "string" && /^\d+$/.test(pageCountRaw.trim()) ? parseInt(pageCountRaw.trim(), 10) : null;
  const safeClientPageCount = clientPageCount && clientPageCount > 0 ? clientPageCount : null;

  if (!urlText) {
    return json
      ? NextResponse.json({ ok: false, error: "MISSING" }, { status: 400 })
      : NextResponse.redirect(new URL("/admin/textbooks/register?error=missing", req.url));
  }

  const urls = urlText
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    return json
      ? NextResponse.json({ ok: false, error: "MISSING" }, { status: 400 })
      : NextResponse.redirect(new URL("/admin/textbooks/register?error=missing", req.url));
  }

  // 제목이 비어 있으면 첫 URL의 파일명으로 자동 생성(서버 폴백)
  if (!title) {
    title = guessTitleFromUrl(urls[0]!) || "";
  }
  if (!title) {
    return json
      ? NextResponse.json({ ok: false, error: "MISSING_TITLE" }, { status: 400 })
      : NextResponse.redirect(new URL("/admin/textbooks/register?error=missing", req.url));
  }

  for (const u of urls) {
    if (!isGoogleStorageUrl(u)) {
      return json
        ? NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 })
        : NextResponse.redirect(new URL("/admin/textbooks/register?error=invalid_url", req.url));
    }
  }

  const entitlementDays =
    typeof entitlementDaysRaw === "string" && /^\d+$/.test(entitlementDaysRaw.trim())
      ? Math.max(1, Math.min(3650, parseInt(entitlementDaysRaw.trim(), 10)))
      : 30;

  const isPublished =
    typeof isPublishedRaw === "string" ? isPublishedRaw === "1" || isPublishedRaw === "true" || isPublishedRaw === "on" : true;

  const last = await prisma.textbook
    .findFirst({
      where: { ownerId: teacher.id },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    .catch(() => null);
  const basePosition = Math.max(0, (last as { position?: number } | null)?.position ?? 0) + 1;

  // 첫 URL을 대표 파일로 사용(기존 컬럼), 전체는 files에 저장
  const files: any[] = [];
  for (let i = 0; i < urls.length; i += 1) {
    const u = urls[i]!;
    const inferredName = guessFileNameFromUrl(u) || `file-${i + 1}.pdf`;
    const head = await getUrlHeadInfo(u);
    const headType = head.contentType?.toLowerCase() ?? "";
    const isPdf = headType.includes("application/pdf") || /\.pdf(\?|$)/i.test(u) || inferredName.toLowerCase().endsWith(".pdf");
    const mimeType = headType.includes("application/pdf") ? "application/pdf" : head.contentType || (isPdf ? "application/pdf" : "application/octet-stream");
    const sizeBytes = head.sizeBytes || 0;
    // 페이지 수는 브라우저(pdf.js)에서 정확히 계산하여 함께 전송합니다.
    const pageCount = null;
    files.push({
      storedPath: u,
      originalName: inferredName,
      mimeType,
      sizeBytes,
      pageCount,
    });
  }

  const primary = files[0]!;
  // 브라우저(pdf.js)에서 계산한 페이지 수를 우선 적용(정확도 ↑)
  if (safeClientPageCount) {
    primary.pageCount = safeClientPageCount;
    if (files[0]) files[0].pageCount = safeClientPageCount;
  }

  // files 컬럼이 없는 환경일 수 있어 안전하게 create 시도
  let createdId: string | null = null;
  try {
    const created = await prisma.textbook.create({
      data: {
        ownerId: teacher.id,
        position: basePosition,
        title,
        storedPath: primary.storedPath,
        originalName: primary.originalName,
        mimeType: primary.mimeType,
        sizeBytes: primary.sizeBytes,
        pageCount: primary.pageCount,
        thumbnailUrl: safeThumbnailDataUrl,
        entitlementDays,
        isPublished,
        files,
      } as any,
      select: { id: true },
    });
    createdId = created.id;
  } catch (e) {
    console.error("[admin/textbooks/register] textbook.create failed, retrying without files:", e);
    const created = await prisma.textbook.create({
      data: {
        ownerId: teacher.id,
        position: basePosition,
        title,
        storedPath: primary.storedPath,
        originalName: primary.originalName,
        mimeType: primary.mimeType,
        sizeBytes: primary.sizeBytes,
        pageCount: primary.pageCount,
        thumbnailUrl: safeThumbnailDataUrl,
        entitlementDays,
        isPublished,
      } as any,
      select: { id: true },
    });
    createdId = created.id;
  }

  if (json) {
    return NextResponse.json({ ok: true, textbookId: createdId });
  }
  // JS 없이도 계속 등록하기 쉽게: 등록 페이지로 유지
  return NextResponse.redirect(new URL("/admin/textbooks/register?created=1", req.url));
}

