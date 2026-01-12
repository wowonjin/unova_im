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

function pickForwardHeaders(req: Request): HeadersInit {
  const h: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) h["range"] = range;
  // pdf.js가 필요한 경우가 있어 accept도 전달
  const accept = req.headers.get("accept");
  if (accept) h["accept"] = accept;
  return h;
}

function pickResponseHeaders(res: Response): HeadersInit {
  const out = new Headers();
  const pass = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "cache-control",
  ];
  for (const k of pass) {
    const v = res.headers.get(k);
    if (v) out.set(k, v);
  }
  // same-origin이라 CORS는 필수는 아니지만, fetch/XHR 안정성 위해 명시
  out.set("access-control-allow-origin", "*");
  return out;
}

/**
 * GET /api/admin/textbooks/pdf-proxy?url=...
 * - 관리자 전용
 * - Google Storage URL만 allowlist로 프록시
 * - pdf.js가 읽을 수 있도록 same-origin으로 PDF를 스트리밍
 */
export async function GET(req: Request) {
  await requireAdminUser();

  const u = new URL(req.url);
  const rawUrl = (u.searchParams.get("url") || "").trim();
  if (!rawUrl) return NextResponse.json({ ok: false, error: "MISSING_URL" }, { status: 400 });
  if (!isGoogleStorageUrl(rawUrl)) return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });

  let remote: Response;
  try {
    remote = await fetch(rawUrl, {
      method: "GET",
      headers: pickForwardHeaders(req),
      redirect: "follow",
    });
  } catch (e) {
    console.error("[pdf-proxy] fetch failed:", e);
    return NextResponse.json({ ok: false, error: "FETCH_FAILED" }, { status: 502 });
  }

  if (!remote.ok && remote.status !== 206) {
    return NextResponse.json({ ok: false, error: "REMOTE_ERROR", status: remote.status }, { status: 502 });
  }

  return new NextResponse(remote.body, {
    status: remote.status,
    headers: pickResponseHeaders(remote),
  });
}

