import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { imwebFetchMember } from "@/lib/imweb";

export const runtime = "nodejs";

/**
 * 아임웹 SSO 로그인 엔드포인트
 * 
 * URL 형식:
 * /api/auth/imweb-sso?code={member_code}&ts={timestamp}&sig={signature}&name={name}&email={email}&img={profile_image_url}
 * 
 * 서명 검증:
 * signature = HMAC-SHA256(member_code:timestamp, IMWEB_SSO_SECRET)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const memberCode = url.searchParams.get("code");
  const timestamp = url.searchParams.get("ts");
  const signature = url.searchParams.get("sig");
  const name = url.searchParams.get("name");
  const email = url.searchParams.get("email");
  const profileImageUrl = url.searchParams.get("img");
  const redirectTo = url.searchParams.get("redirect") || "/dashboard";

  // 1. 필수 파라미터 확인
  if (!memberCode || !timestamp || !signature) {
    return NextResponse.redirect(new URL("/login?error=missing_params", req.url));
  }

  // 2. 타임스탬프 유효성 검사 (5분 이내)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return NextResponse.redirect(new URL("/login?error=expired", req.url));
  }

  // 3. 서명 검증
  const secret = process.env.IMWEB_SSO_SECRET;
  if (!secret) {
    console.error("IMWEB_SSO_SECRET is not configured");
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${memberCode}:${timestamp}`)
    .digest("hex");

  if (signature !== expectedSig) {
    return NextResponse.redirect(new URL("/login?error=invalid_signature", req.url));
  }

  // 4. 회원 조회 또는 생성
  // code가 이메일 형식인지 확인
  const isEmailCode = memberCode.includes("@");
  const lookupEmail = isEmailCode ? memberCode.toLowerCase() : (email?.toLowerCase() || null);

  let user = await prisma.user.findFirst({
    where: isEmailCode
      ? { email: memberCode.toLowerCase() }
      : { imwebMemberCode: memberCode },
  });

  // 이메일로 검색 실패 시 imwebMemberCode로 재시도
  if (!user && !isEmailCode) {
    user = await prisma.user.findFirst({
      where: { imwebMemberCode: memberCode },
    });
  }

  // 이메일로도 못 찾으면 email 파라미터로 검색
  if (!user && lookupEmail) {
    user = await prisma.user.findFirst({
      where: { email: lookupEmail },
    });
  }

  if (!user) {
    // 새 회원 생성
    let fetchedEmail = lookupEmail;
    let fetchedName = name;
    let fetchedProfileImage = profileImageUrl;

    // 이메일이 없고 회원코드로 아임웹 API 조회 시도
    if (!fetchedEmail && !isEmailCode) {
      try {
        const memberData = await imwebFetchMember(memberCode);
        const data = (memberData as { data?: Record<string, unknown> })?.data ?? memberData;
        if (typeof data === "object" && data !== null) {
          const d = data as Record<string, unknown>;
          fetchedEmail = (d.email as string) || null;
          fetchedName = (d.name as string) || (d.member_name as string) || (d.nickname as string) || null;
          fetchedProfileImage = (d.profile_image as string) || (d.profile_img as string) || null;
        }
      } catch (e) {
        console.error("Failed to fetch member from Imweb:", e);
      }
    }

    if (!fetchedEmail) {
      // 이메일을 얻을 수 없으면 임시 이메일 생성
      fetchedEmail = `imweb_${memberCode}@unova.classroom`;
    }

    user = await prisma.user.create({
      data: {
        email: fetchedEmail.toLowerCase(),
        imwebMemberCode: isEmailCode ? null : memberCode,
        name: fetchedName || null,
        profileImageUrl: fetchedProfileImage || null,
        lastLoginAt: new Date(),
      },
    });
  } else {
    // 기존 회원 정보 업데이트
    const updateData: Record<string, unknown> = { lastLoginAt: new Date() };
    if (name && !user.name) updateData.name = name;
    if (lookupEmail && user.email.includes("@unova.classroom")) updateData.email = lookupEmail;
    if (profileImageUrl && !user.profileImageUrl) updateData.profileImageUrl = profileImageUrl;
    // 회원코드가 없으면 저장
    if (!isEmailCode && memberCode && !user.imwebMemberCode) {
      updateData.imwebMemberCode = memberCode;
    }

    if (Object.keys(updateData).length > 1) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }
  }

  // 5. 세션 생성
  await createSession(user.id);

  // 6. 대시보드로 리다이렉트
  const redirectUrl = new URL(redirectTo, req.url);
  return NextResponse.redirect(redirectUrl);
}

