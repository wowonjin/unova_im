import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test((s ?? "").trim());
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
    console.error("[url-metadata] Failed to read HEAD:", e);
    return { sizeBytes: 0, contentType: null };
  }
}

async function getPdfPageCountFromUrl(url: string): Promise<number | null> {
  try {
    // PDF 파일을 직접 다운로드해서 페이지 수 파싱 (pdfjs-dist의 worker 이슈 회피)
    const response = await fetch(url, {
      headers: { Range: "bytes=0-65535" }, // 처음 64KB만 다운로드 (대부분의 PDF 메타데이터가 여기에 있음)
    });
    
    if (!response.ok) {
      // Range 요청이 지원 안되면 전체 다운로드 시도
      const fullResponse = await fetch(url);
      if (!fullResponse.ok) return null;
      const buffer = Buffer.from(await fullResponse.arrayBuffer());
      return parsePdfPageCount(buffer);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    let pageCount = parsePdfPageCount(buffer);
    
    // 처음 64KB에서 못 찾으면 끝 부분도 확인 (PDF 트레일러가 끝에 있을 수 있음)
    if (!pageCount) {
      const headResponse = await fetch(url, { method: "HEAD" });
      const contentLength = parseInt(headResponse.headers.get("content-length") || "0", 10);
      if (contentLength > 65536) {
        const tailStart = Math.max(0, contentLength - 65536);
        const tailResponse = await fetch(url, {
          headers: { Range: `bytes=${tailStart}-${contentLength - 1}` },
        });
        if (tailResponse.ok) {
          const tailBuffer = Buffer.from(await tailResponse.arrayBuffer());
          pageCount = parsePdfPageCount(tailBuffer);
        }
      }
    }
    
    return pageCount;
  } catch (e) {
    console.error("[url-metadata] Failed to get PDF page count:", e);
    return null;
  }
}

function parsePdfPageCount(buffer: Buffer): number | null {
  const text = buffer.toString("latin1"); // PDF는 binary지만 ASCII 부분만 필요
  
  // 방법 1: /Count N 패턴 찾기 (페이지 트리의 총 페이지 수)
  const countMatches = text.match(/\/Count\s+(\d+)/g);
  if (countMatches && countMatches.length > 0) {
    // 가장 큰 Count 값이 보통 전체 페이지 수
    let maxCount = 0;
    for (const match of countMatches) {
      const num = parseInt(match.replace(/\/Count\s+/, ""), 10);
      if (num > maxCount) maxCount = num;
    }
    if (maxCount > 0) return maxCount;
  }
  
  // 방법 2: /Type /Page 개수 세기 (각 페이지 객체)
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
  if (pageMatches && pageMatches.length > 0) {
    return pageMatches.length;
  }
  
  return null;
}

/**
 * GET /api/admin/textbooks/url-metadata?url=...
 * - 관리자 전용
 * - 구글 스토리지 URL에서 용량/페이지수를 계산해 등록 폼 자동 채움에 사용
 * - 첫 페이지 이미지는 CORS 이슈를 피하기 위해 클라이언트(pdf.js) + pdf-proxy로 생성
 */
export async function GET(req: Request) {
  await requireAdminUser();

  const u = new URL(req.url);
  const rawUrl = (u.searchParams.get("url") || "").trim();
  if (!rawUrl) return NextResponse.json({ ok: false, error: "MISSING_URL" }, { status: 400 });
  if (!isGoogleStorageUrl(rawUrl)) return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });

  const head = await getUrlHeadInfo(rawUrl);
  const headType = (head.contentType || "").toLowerCase();
  const isPdfCandidate = headType.includes("application/pdf") || /\.pdf(\?|$)/i.test(rawUrl);
  const pageCount = isPdfCandidate ? await getPdfPageCountFromUrl(rawUrl) : null;

  // same-origin 프록시 URL: pdf.js가 안정적으로 로드 가능
  const proxyUrl = `/api/admin/textbooks/pdf-proxy?url=${encodeURIComponent(rawUrl)}`;

  return NextResponse.json({
    ok: true,
    url: rawUrl,
    sizeBytes: head.sizeBytes || 0,
    contentType: head.contentType,
    pageCount,
    proxyUrl,
  });
}

