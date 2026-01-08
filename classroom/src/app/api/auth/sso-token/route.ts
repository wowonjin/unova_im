import { NextResponse } from "next/server";
import crypto from "crypto";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

// CORS 헤더 설정
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

/**
 * SSO 토큰 생성 API
 * 
 * GET /api/auth/sso-token?email={email}&secret={secret}
 * 
 * 아임웹에서 호출하여 로그인 토큰을 생성
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const providedSecret = url.searchParams.get("secret");
  
  const secret = process.env.IMWEB_SSO_SECRET;
  
  // 시크릿 검증
  if (!secret || !providedSecret || providedSecret !== secret) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" }, 
      { status: 401, headers: corsHeaders() }
    );
  }
  
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "INVALID_EMAIL" }, 
      { status: 400, headers: corsHeaders() }
    );
  }
  
  // 토큰 생성: base64(email:timestamp:hash)
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = crypto
    .createHash("sha256")
    .update(email.toLowerCase() + timestamp + secret)
    .digest("hex")
    .slice(0, 16);
  
  const token = Buffer.from(`${email.toLowerCase()}:${timestamp}:${hash}`).toString("base64");
  
  // SSO URL 생성
  const baseUrl = getBaseUrl(req);
  const ssoUrl = `${baseUrl}/api/auth/imweb-sso?token=${encodeURIComponent(token)}`;
  
  return NextResponse.json(
    { token, ssoUrl, expiresIn: 600 },
    { headers: corsHeaders() }
  );
}

