import crypto from "crypto";
import { cookies } from "next/headers";

type Provider = "kakao" | "naver";

const COOKIE_STATE_PREFIX = "oauth_state_";
const COOKIE_REDIRECT_PREFIX = "oauth_redirect_";
const COOKIE_PENDING_PREFIX = "oauth_pending_";

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

export async function setPendingOAuthAccount(input: {
  provider: Provider;
  providerUserId: string;
  redirectTo: string;
  email?: string | null;
  name?: string | null;
  profileImageUrl?: string | null;
}) {
  const cookieStore = await cookies();
  cookieStore.set(`${COOKIE_PENDING_PREFIX}provider`, input.provider, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  cookieStore.set(`${COOKIE_PENDING_PREFIX}providerUserId`, input.providerUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  cookieStore.set(`${COOKIE_PENDING_PREFIX}redirect`, input.redirectTo || "/", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  if (input.email) {
    cookieStore.set(`${COOKIE_PENDING_PREFIX}email`, input.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
  }
  if (input.name) {
    cookieStore.set(`${COOKIE_PENDING_PREFIX}name`, input.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
  }
  if (input.profileImageUrl) {
    cookieStore.set(`${COOKIE_PENDING_PREFIX}profileImageUrl`, input.profileImageUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
  }
}

export async function consumePendingOAuthAccount(): Promise<{
  provider: Provider;
  providerUserId: string;
  redirectTo: string;
  email?: string | null;
  name?: string | null;
  profileImageUrl?: string | null;
} | null> {
  const cookieStore = await cookies();
  const provider = (cookieStore.get(`${COOKIE_PENDING_PREFIX}provider`)?.value || "") as Provider | "";
  const providerUserId = cookieStore.get(`${COOKIE_PENDING_PREFIX}providerUserId`)?.value || "";
  const redirectTo = cookieStore.get(`${COOKIE_PENDING_PREFIX}redirect`)?.value || "/";
  const email = cookieStore.get(`${COOKIE_PENDING_PREFIX}email`)?.value || null;
  const name = cookieStore.get(`${COOKIE_PENDING_PREFIX}name`)?.value || null;
  const profileImageUrl = cookieStore.get(`${COOKIE_PENDING_PREFIX}profileImageUrl`)?.value || null;

  cookieStore.delete(`${COOKIE_PENDING_PREFIX}provider`);
  cookieStore.delete(`${COOKIE_PENDING_PREFIX}providerUserId`);
  cookieStore.delete(`${COOKIE_PENDING_PREFIX}redirect`);
  cookieStore.delete(`${COOKIE_PENDING_PREFIX}email`);
  cookieStore.delete(`${COOKIE_PENDING_PREFIX}name`);
  cookieStore.delete(`${COOKIE_PENDING_PREFIX}profileImageUrl`);

  if ((provider !== "kakao" && provider !== "naver") || !providerUserId) return null;
  return { provider, providerUserId, redirectTo, email, name, profileImageUrl };
}


