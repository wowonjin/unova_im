import { NextResponse } from "next/server";
import { getBaseUrl, setOAuthState } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect");

  // Kakao 앱키 변수명이 환경/문서마다 달라서 alias 지원
  const clientId =
    process.env.KAKAO_REST_API_KEY ||
    process.env.KAKAO_CLIENT_ID ||
    process.env.KAKAO_APP_KEY;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", req.url));
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/kakao/callback`;
  const state = await setOAuthState("kakao", redirectTo);

  const authorize = new URL("https://kauth.kakao.com/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("state", state);
  // Optional: request email/profile scopes if enabled on Kakao developer console
  authorize.searchParams.set("scope", "account_email profile_nickname profile_image");

  return NextResponse.redirect(authorize.toString());
}


