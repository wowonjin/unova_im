import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { consumeOAuthState, getBaseUrl, setPendingOAuthAccount } from "@/lib/oauth";

export const runtime = "nodejs";

type KakaoMeResponse = {
  id: number;
  properties?: { nickname?: string; profile_image?: string; thumbnail_image?: string };
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string; profile_image_url?: string; thumbnail_image_url?: string };
  };
};

async function exchangeKakaoToken(opts: { code: string; redirectUri: string }) {
  // Kakao 앱키 변수명이 환경/문서마다 달라서 alias 지원
  const clientId =
    process.env.KAKAO_REST_API_KEY ||
    process.env.KAKAO_CLIENT_ID ||
    process.env.KAKAO_APP_KEY;
  if (!clientId) throw new Error("KAKAO_NOT_CONFIGURED");

  const clientSecret = process.env.KAKAO_CLIENT_SECRET || "";
  const tokenUrl = "https://kauth.kakao.com/oauth/token";

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("redirect_uri", opts.redirectUri);
  body.set("code", opts.code);
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`KAKAO_TOKEN_ERROR:${res.status}:${JSON.stringify(json).slice(0, 300)}`);
  }
  return json as { access_token: string };
}

async function fetchKakaoProfile(accessToken: string): Promise<KakaoMeResponse> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });
  const json = (await res.json().catch(() => null)) as KakaoMeResponse | null;
  if (!res.ok || !json) throw new Error(`KAKAO_PROFILE_ERROR:${res.status}`);
  return json;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromQuery = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/kakao/callback`;
  const base = new URL(baseUrl);

  const { state: stateFromCookie, redirectTo } = await consumeOAuthState("kakao");

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
    const token = await exchangeKakaoToken({ code, redirectUri });
    const profile = await fetchKakaoProfile(token.access_token);

    const providerUserId = String(profile.id);
    const emailFromProvider = profile.kakao_account?.email?.toLowerCase().trim() || null;
    const email = emailFromProvider || `kakao_${providerUserId}@social.local`;

    const nickname =
      profile.kakao_account?.profile?.nickname ||
      profile.properties?.nickname ||
      null;

    const profileImageUrl =
      profile.kakao_account?.profile?.profile_image_url ||
      profile.properties?.profile_image ||
      null;

    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: "kakao", providerUserId } },
      select: { userId: true },
    });

    const existingUserByEmail = emailFromProvider
      ? await prisma.user.findUnique({ where: { email: emailFromProvider } })
      : null;

    // 계정이 없다면 회원가입 페이지로 이동(프리필 제공)
    if (!existingAccount && !existingUserByEmail) {
      await setPendingOAuthAccount({
        provider: "kakao",
        providerUserId,
        redirectTo: redirectTo || "/",
        email: emailFromProvider,
        name: nickname,
        profileImageUrl,
      });
      const sp = new URLSearchParams();
      sp.set("from", "kakao");
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
      where: { provider_providerUserId: { provider: "kakao", providerUserId } },
      update: { userId: user.id },
      create: { provider: "kakao", providerUserId, userId: user.id },
    });

    await createSession(user.id);
    return NextResponse.redirect(new URL(redirectTo || "/dashboard", base));
  } catch (e) {
    console.error("[kakao callback] error", e);
    return NextResponse.redirect(new URL(`/login?error=oauth_server_error`, base));
  }
}


