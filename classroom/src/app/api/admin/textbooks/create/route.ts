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
    console.error("[getUrlHeadInfo] Failed to read HEAD:", e);
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
  } catch (e) {
    console.error("[getPdfPageCountFromUrl] Failed to get PDF page count:", e);
    return null;
  }
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

  // position: admin 목록에서 드래그&드롭 정렬을 위한 값 (내림차순 정렬)
  const last = await prisma.textbook
    .findFirst({
      where: { ownerId: teacher.id },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    .catch(() => null);
  const basePosition = Math.max(0, (last as { position?: number } | null)?.position ?? 0) + 1;

  const form = await req.formData();
  const urlRaw = form.get("url");
  const titleRaw = form.get("title");
  const teacherNameRaw = form.get("teacherName");
  const subjectNameRaw = form.get("subjectName");
  const isPublishedRaw = form.get("isPublished");
  const entitlementDaysRaw = form.get("entitlementDays");
  const imwebProdCodeRaw = form.get("imwebProdCode");
  const priceRaw = form.get("price");
  const originalPriceRaw = form.get("originalPrice");

  const isPublished =
    typeof isPublishedRaw === "string" ? isPublishedRaw === "1" || isPublishedRaw === "true" || isPublishedRaw === "on" : true;
  const entitlementDays =
    typeof entitlementDaysRaw === "string" && /^\d+$/.test(entitlementDaysRaw.trim())
      ? Math.max(1, Math.min(3650, parseInt(entitlementDaysRaw.trim(), 10)))
      : 30;
  const imwebProdCode = typeof imwebProdCodeRaw === "string" && imwebProdCodeRaw.trim().length > 0 ? imwebProdCodeRaw.trim() : null;
  const teacherName = typeof teacherNameRaw === "string" && teacherNameRaw.trim().length > 0 ? teacherNameRaw.trim() : null;
  const subjectName = typeof subjectNameRaw === "string" && subjectNameRaw.trim().length > 0 ? subjectNameRaw.trim() : null;

  const parseMoney = (v: FormDataEntryValue | null): number | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!s) return null;
    // "49,000" 같이 입력된 케이스도 허용
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return null;
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };
  const price = parseMoney(priceRaw);
  const originalPrice = parseMoney(originalPriceRaw);
  // 원가가 판매가보다 낮게 들어오면 원가를 무시(할인율 UI가 깨지는 것 방지)
  const safeOriginalPrice = originalPrice != null && price != null && originalPrice < price ? null : originalPrice;

  const titleBase = typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw.trim() : null;

  // 1) URL 방식(구글 콘솔/GCS 등) - 여러 줄 입력 지원
  const urls =
    typeof urlRaw === "string" && urlRaw.trim().length > 0
      ? urlRaw
          .split(/\r?\n|,/g)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  // 2) 파일 업로드 방식 - 다중 업로드 지원
  const files = form
    .getAll("file")
    .filter((v): v is File => v instanceof File && (v.size ?? 0) > 0);

  // URL이 있으면 URL이 우선 (UI 힌트와 동일)
  if (urls.length > 0) {
    const MAX_BULK = 50;
    const normalized = urls.slice(0, MAX_BULK);

    let pos = basePosition;
    for (let i = 0; i < normalized.length; i += 1) {
      const url = normalized[i];
      if (!isHttpUrl(url)) return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
      // URL 자체가 유효한 형태인지 확인
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
      }

      const inferredName = guessFileNameFromUrl(url);
      const title =
        titleBase != null
          ? normalized.length === 1
            ? titleBase
            : `${titleBase} ${i + 1}`
          : inferredName || "교재";
      const originalName = inferredName || title;
      const guessedMimeType = originalName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";

      // URL HEAD에서 파일 크기/콘텐츠 타입 가져오기 (GCS URL이 .pdf로 끝나지 않는 케이스 대응)
      const head = await getUrlHeadInfo(url);
      const headType = head.contentType?.toLowerCase() ?? "";
      const isPdfCandidate = headType.includes("application/pdf") || guessedMimeType === "application/pdf" || /\.pdf(\?|$)/i.test(url);
      const mimeType = headType.includes("application/pdf") ? "application/pdf" : head.contentType || (isPdfCandidate ? "application/pdf" : guessedMimeType);
      const sizeBytes = head.sizeBytes;
      const pageCount = isPdfCandidate ? await getPdfPageCountFromUrl(url) : null;

      await createTextbookSafe({
        ownerId: teacher.id,
        position: pos,
        title,
        teacherName,
        subjectName,
        // storedPath 컬럼을 외부 URL 저장용으로도 재사용(다운로드 라우트에서 http(s)면 redirect 처리)
        storedPath: url,
        originalName,
        mimeType,
        sizeBytes,
        pageCount,
        isPublished,
        entitlementDays,
        imwebProdCode,
        price,
        originalPrice: safeOriginalPrice,
      });
      pos += 1;
    }

    return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
  }

  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "NO_URL_OR_FILE" }, { status: 400 });
  }

  const dir = path.join(getStorageRoot(), "textbooks", teacher.id);
  await ensureDir(dir);

  let pos = basePosition;
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const ext = path.extname(file.name || "").slice(0, 12);
    const baseName = file.name ? path.basename(file.name, ext) : "";
    const title =
      titleBase != null
        ? files.length === 1
          ? titleBase
          : `${titleBase} ${i + 1}`
        : (baseName || file.name || "교재");

    const bytes = Buffer.from(await file.arrayBuffer());

    const storedName = `${crypto.randomUUID()}${ext || ""}`;
    const storedPath = path.join("textbooks", teacher.id, storedName).replace(/\\/g, "/");
    const fullPath = path.join(dir, storedName);
    await fs.writeFile(fullPath, bytes);

    await createTextbookSafe({
      ownerId: teacher.id,
      position: pos,
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
      price,
      originalPrice: safeOriginalPrice,
    });
    pos += 1;
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}


