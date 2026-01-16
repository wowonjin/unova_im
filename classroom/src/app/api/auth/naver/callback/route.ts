import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { consumeOAuthState, getBaseUrl, setPendingOAuthAccount } from "@/lib/oauth";

export const runtime = "nodejs";

type NaverTokenResponse =
  | { access_token: string; token_type: string; refresh_token?: string; expires_in?: string }
  | { error: string; error_description?: string };

type NaverMeResponse = {
  resultcode: string;
  message: string;
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

async function exchangeNaverToken(opts: { code: string; state: string }) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("NAVER_NOT_CONFIGURED");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("code", opts.code);
  body.set("state", opts.state);

  const res = await fetch("https://nid.naver.com/oauth2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json().catch(() => ({}))) as NaverTokenResponse;
  if (!res.ok) {
    throw new Error(`NAVER_TOKEN_ERROR:${res.status}:${JSON.stringify(json).slice(0, 300)}`);
  }
  if ("error" in json) {
    throw new Error(`NAVER_TOKEN_ERROR:${json.error}:${json.error_description || ""}`);
  }
  return json;
}

async function fetchNaverProfile(accessToken: string): Promise<NaverMeResponse> {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => null)) as NaverMeResponse | null;
  if (!res.ok || !json) throw new Error(`NAVER_PROFILE_ERROR:${res.status}`);
  return json;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromQuery = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = getBaseUrl(req);
  const base = new URL(baseUrl);

  const { state: stateFromCookie, redirectTo } = await consumeOAuthState("naver");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth_failed`, base));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=oauth_missing_code`, base));
  }
  if (!stateFromCookie || !stateFromQuery || stateFromCookie !== stateFromQuery) {
    return NextResponse.redirect(new URL(`/login?error=oauth_state_mismatch`, base));
  }

  try {
    const token = await exchangeNaverToken({ code, state: stateFromQuery });
    const profile = await fetchNaverProfile(token.access_token);

    const providerUserId = String(profile.response?.id || "");
    if (!providerUserId) throw new Error("NAVER_PROFILE_MISSING_ID");

    const emailFromProvider = profile.response?.email?.toLowerCase().trim() || null;
    const nickname = profile.response?.nickname || profile.response?.name || null;
    const profileImageUrl = profile.response?.profile_image || null;

    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: "naver", providerUserId } },
      select: { userId: true },
    });

    const existingUserByEmail = emailFromProvider
      ? await prisma.user.findUnique({ where: { email: emailFromProvider } })
      : null;

    if (!existingAccount && !existingUserByEmail) {
      await setPendingOAuthAccount({
        provider: "naver",
        providerUserId,
        redirectTo: redirectTo || "/",
        email: emailFromProvider,
        name: nickname,
        profileImageUrl,
      });

      const sp = new URLSearchParams();
      sp.set("from", "naver");
      sp.set("redirect", redirectTo || "/");
      if (emailFromProvider) sp.set("email", emailFromProvider);
      if (nickname) sp.set("name", nickname);
      return NextResponse.redirect(new URL(`/signup?${sp.toString()}`, base));
    }

    const user = existingAccount
      ? await prisma.user.update({
          where: { id: existingAccount.userId },
          data: {
            ...(nickname ? { name: nickname } : {}),
            ...(profileImageUrl ? { profileImageUrl } : {}),
            lastLoginAt: new Date(),
          },
        })
      : await prisma.user.update({
          where: { id: existingUserByEmail!.id },
          data: {
            ...(nickname ? { name: nickname } : {}),
            ...(profileImageUrl ? { profileImageUrl } : {}),
            lastLoginAt: new Date(),
          },
        });

    await prisma.oAuthAccount.upsert({
      where: { provider_providerUserId: { provider: "naver", providerUserId } },
      update: { userId: user.id },
      create: { provider: "naver", providerUserId, userId: user.id },
    });

    await createSession(user.id);
    return NextResponse.redirect(new URL(redirectTo || "/dashboard", base));
  } catch (e) {
    console.error("[naver callback] error", e);
    return NextResponse.redirect(new URL(`/login?error=oauth_server_error`, base));
  }
}

