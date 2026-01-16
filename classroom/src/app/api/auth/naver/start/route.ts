import { NextResponse } from "next/server";
import { getBaseUrl, setOAuthState } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect");

  const clientId = process.env.NAVER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", getBaseUrl(req)));
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/naver/callback`;
  const state = await setOAuthState("naver", redirectTo);

  const authorize = new URL("https://nid.naver.com/oauth2.0/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize.toString());
}

