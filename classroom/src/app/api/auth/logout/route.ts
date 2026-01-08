import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

function isAllowedLogoutRedirect(target: URL, base: URL): boolean {
  // Always allow same-origin redirects.
  if (target.origin === base.origin) return true;

  // Allow localhost redirects only in non-production (for local dev convenience).
  if (process.env.NODE_ENV !== "production") {
    const h = target.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return true;
  }

  // Allow Unova-owned domains (Imweb + classroom).
  const host = target.hostname.toLowerCase();
  return host === "unova.co.kr" || host.endsWith(".unova.co.kr");
}

export async function GET(req: Request) {
  await destroySession();

  const requestUrl = new URL(req.url);
  const redirectTo = requestUrl.searchParams.get("redirect");

  // Use a stable external base URL (respects x-forwarded-* and NEXT_PUBLIC_BASE_URL)
  // to avoid redirecting users to internal proxy hosts like localhost:10000 in production.
  const base = new URL(getBaseUrl(req));

  // 아임웹으로 리다이렉트하거나 로그인 페이지로 이동
  if (redirectTo) {
    try {
      const dest = redirectTo.startsWith("/") ? new URL(redirectTo, base) : new URL(redirectTo);
      if (isAllowedLogoutRedirect(dest, base)) {
        return NextResponse.redirect(dest);
      }
    } catch {
      // Ignore invalid redirect URLs and fall back to /login.
    }
  }

  return NextResponse.redirect(new URL("/login", base));
}

export async function POST(req: Request) {
  await destroySession();
  return NextResponse.json({ ok: true });
}

