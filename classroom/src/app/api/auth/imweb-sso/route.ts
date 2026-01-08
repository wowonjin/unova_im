import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

/**
 * 간단한 토큰 검증 함수
 * 토큰 형식: base64(email:timestamp:hash)
 * hash = sha256(email + timestamp + secret).slice(0, 16)
 */
function verifySimpleToken(token: string, secret: string): { valid: boolean; email: string | null } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return { valid: false, email: null };
    
    const email = parts[0];
    const timestamp = parseInt(parts[1], 10);
    const hash = parts[2];
    
    // 10분 이내 토큰만 유효
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(timestamp) || Math.abs(now - timestamp) > 600) {
      return { valid: false, email: null };
    }
    
    // 해시 검증
    const expectedHash = crypto
      .createHash("sha256")
      .update(email + timestamp + secret)
      .digest("hex")
      .slice(0, 16);
    
    if (hash !== expectedHash) {
      return { valid: false, email: null };
    }
    
    return { valid: true, email };
  } catch {
    return { valid: false, email: null };
  }
}

/**
 * 아임웹 SSO 로그인 엔드포인트
 * 
 * 간단한 방식: /api/auth/imweb-sso?token={base64_token}
 * 기존 방식도 지원: /api/auth/imweb-sso?code={code}&ts={ts}&sig={sig}
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = getBaseUrl(req);
  const secret = process.env.IMWEB_SSO_SECRET;
  
  if (!secret) {
    console.error("IMWEB_SSO_SECRET is not configured");
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  // 간단한 토큰 방식 체크
  const simpleToken = url.searchParams.get("token");
  if (simpleToken) {
    const { valid, email } = verifySimpleToken(simpleToken, secret);
    
    if (!valid || !email) {
      console.log("[SSO] Invalid or expired token");
      return NextResponse.redirect(new URL("/dashboard", baseUrl));
    }
    
    // 이메일로 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      console.log("[SSO] User not found:", email);
      return NextResponse.redirect(new URL("/dashboard", baseUrl));
    }
    
    // 세션 생성
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await createSession(user.id);
    
    console.log("[SSO] Login successful:", email);
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  // 기존 HMAC 방식 (하위 호환)
  const memberCode = url.searchParams.get("code");
  const timestamp = url.searchParams.get("ts");
  const signature = url.searchParams.get("sig");
  const email = url.searchParams.get("email");

  if (!memberCode || !timestamp || !signature) {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${memberCode}:${timestamp}`)
    .digest("hex");

  if (signature !== expectedSig) {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  const isEmailCode = memberCode.includes("@");
  const lookupEmail = isEmailCode ? memberCode.toLowerCase() : (email?.toLowerCase() || null);

  let user = await prisma.user.findFirst({
    where: isEmailCode
      ? { email: memberCode.toLowerCase() }
      : lookupEmail
        ? { email: lookupEmail }
        : { imwebMemberCode: memberCode },
  });

  if (!user && lookupEmail) {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await createSession(user.id);
  }

  return NextResponse.redirect(new URL("/dashboard", baseUrl));
}

