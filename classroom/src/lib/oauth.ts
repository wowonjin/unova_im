import crypto from "crypto";
import { cookies } from "next/headers";

type Provider = "kakao" | "naver";

const COOKIE_STATE_PREFIX = "oauth_state_";
const COOKIE_REDIRECT_PREFIX = "oauth_redirect_";

function randomState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = req.headers.get("host");
  if (host && !host.includes("localhost")) return `https://${host}`;

  return new URL(req.url).origin;
}

export async function setOAuthState(provider: Provider, redirectTo: string | null): Promise<string> {
  const state = randomState();
  const cookieStore = await cookies();

  cookieStore.set(`${COOKIE_STATE_PREFIX}${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60, // 10 minutes
    path: "/",
  });

  cookieStore.set(`${COOKIE_REDIRECT_PREFIX}${provider}`, redirectTo || "/", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  return state;
}

export async function consumeOAuthState(provider: Provider): Promise<{ state: string | null; redirectTo: string }> {
  const cookieStore = await cookies();
  const state = cookieStore.get(`${COOKIE_STATE_PREFIX}${provider}`)?.value || null;
  const redirectTo = cookieStore.get(`${COOKIE_REDIRECT_PREFIX}${provider}`)?.value || "/";

  cookieStore.delete(`${COOKIE_STATE_PREFIX}${provider}`);
  cookieStore.delete(`${COOKIE_REDIRECT_PREFIX}${provider}`);

  return { state, redirectTo };
}


