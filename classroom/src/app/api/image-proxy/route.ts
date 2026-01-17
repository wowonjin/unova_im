import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_URL_LEN = 10_000;

function getAllowedHosts(): string[] {
  const raw =
    process.env.IMAGE_PROXY_ALLOW_HOSTS ||
    process.env.UNOVA_IMAGE_PROXY_ALLOW_HOSTS ||
    // sensible defaults for this repo (GCS + imweb)
    "storage.googleapis.com,storage.cloud.google.com,cdn.imweb.me,unova.co.kr,www.unova.co.kr";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isHostAllowed(hostname: string): boolean {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) return false;

  const allowed = getAllowedHosts();
  for (const entry of allowed) {
    // entry like ".example.com" allows subdomains
    if (entry.startsWith(".")) {
      if (host === entry.slice(1) || host.endsWith(entry)) return true;
      continue;
    }
    if (host === entry) return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) return NextResponse.json({ ok: false, error: "MISSING_URL" }, { status: 400 });
  if (urlParam.length > MAX_URL_LEN) return NextResponse.json({ ok: false, error: "URL_TOO_LONG" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_URL" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "UNSUPPORTED_PROTOCOL" }, { status: 400 });
  }
  if (target.username || target.password) {
    return NextResponse.json({ ok: false, error: "AUTH_IN_URL_NOT_ALLOWED" }, { status: 400 });
  }
  if (target.port && target.port !== "80" && target.port !== "443") {
    return NextResponse.json({ ok: false, error: "PORT_NOT_ALLOWED" }, { status: 400 });
  }
  if (!isHostAllowed(target.hostname)) {
    return NextResponse.json({ ok: false, error: "HOST_NOT_ALLOWED" }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        // keep it conservative: images should be public assets
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "unova-image-proxy/1.0",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "UPSTREAM_FETCH_FAILED", message: msg }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { ok: false, error: "UPSTREAM_BAD_STATUS", status: upstream.status },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const out = new NextResponse(upstream.body, { status: 200 });
  out.headers.set("Content-Type", contentType);
  // `v` 쿼리로 캐시 무효화를 하므로 immutable + 1년 캐시를 강하게 적용
  out.headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const len = upstream.headers.get("content-length");
  if (len) out.headers.set("Content-Length", len);

  return out;
}

