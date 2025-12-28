import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { consumeOAuthState, getBaseUrl, setPendingOAuthAccount } from "@/lib/oauth";

export const runtime = "nodejs";

type NaverMeResponse = {
  resultcode: string;
  message: string;
  response?: {
    id: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

async function exchangeNaverToken(opts: { code: string; state: string; redirectUri: string }) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("NAVER_NOT_CONFIGURED");

  const token = new URL("https://nid.naver.com/oauth2.0/token");
  token.searchParams.set("grant_type", "authorization_code");
  token.searchParams.set("client_id", clientId);
  token.searchParams.set("client_secret", clientSecret);
  token.searchParams.set("code", opts.code);
  token.searchParams.set("state", opts.state);

  const res = await fetch(token.toString(), { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`NAVER_TOKEN_ERROR:${res.status}:${JSON.stringify(json).slice(0, 300)}`);
  }
  return json as { access_token: string };
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
  const redirectUri = `${baseUrl}/api/auth/naver/callback`;

  const { state: stateFromCookie, redirectTo } = await consumeOAuthState("naver");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth_failed`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=oauth_missing_code`, req.url));
  }
  if (!stateFromCookie || !stateFromQuery || stateFromCookie !== stateFromQuery) {
    return NextResponse.redirect(new URL(`/login?error=oauth_state_mismatch`, req.url));
  }

  try {
    const token = await exchangeNaverToken({ code, state: stateFromQuery, redirectUri });
    const me = await fetchNaverProfile(token.access_token);
    const profile = me.response;
    if (!profile?.id) throw new Error("NAVER_PROFILE_INVALID");

    const providerUserId = profile.id;
    const emailFromProvider = profile.email?.toLowerCase().trim() || null;
    const email = emailFromProvider || `naver_${providerUserId}@social.local`;

    const nickname = profile.name || profile.nickname || null;
    const profileImageUrl = profile.profile_image || null;

    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: "naver", providerUserId } },
      select: { userId: true },
    });

    const existingUserByEmail = emailFromProvider
      ? await prisma.user.findUnique({ where: { email: emailFromProvider } })
      : null;

    // 계정이 없다면 회원가입 페이지로 이동(프리필 제공)
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
      return NextResponse.redirect(new URL(`/signup?${sp.toString()}`, req.url));
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
    return NextResponse.redirect(new URL(redirectTo || "/dashboard", req.url));
  } catch (e) {
    console.error("[naver callback] error", e);
    return NextResponse.redirect(new URL(`/login?error=oauth_server_error`, req.url));
  }
}


