import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { consumePendingOAuthAccount } from "@/lib/oauth";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1),
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  phone: z.string().optional(),
  password: z.string().min(8),
  zonecode: z.string().optional(),
  address: z.string().optional(),
  addressDetail: z.string().optional(),
  marketing: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const { name, email, phone, password, zonecode, address, addressDetail } = parsed.data;

    let user;

    try {
      // 소셜 로그인 -> 회원가입으로 넘어온 케이스면 pending 정보를 먼저 읽는다(프로필 이미지 포함)
      const pending = await consumePendingOAuthAccount();

      // 제공자가 이메일을 내려준 경우: 다른 이메일로 가입하며 연동되는 것을 방지
      if (pending?.email && pending.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        return NextResponse.json({ ok: false, error: "SOCIAL_EMAIL_MISMATCH" }, { status: 400 });
      }

      // 이미 가입된 이메일 확인
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json({ ok: false, error: "EMAIL_EXISTS" }, { status: 409 });
      }

      // 사용자 생성
      // 주소 형식: [우편번호] 주소
      const fullAddress = address ? (zonecode ? `[${zonecode}] ${address}` : address) : null;
      
      user = await prisma.user.create({
        data: {
          email,
          name,
          phone: phone || null,
          address: fullAddress,
          addressDetail: addressDetail || null,
          profileImageUrl: pending?.profileImageUrl || null,
          lastLoginAt: new Date(),
        },
        select: { id: true, name: true, profileImageUrl: true },
      });

      // 이메일(일반) 로그인용 비밀번호 해시 저장
      const passwordHash = await bcrypt.hash(password, 10);
      const passwordCiphertext = encryptPassword(password);
      await prisma.emailCredential.create({
        data: {
          userId: user.id,
          passwordHash,
          passwordCiphertext,
        },
      });

      // 소셜 로그인 -> 회원가입으로 넘어온 케이스면, 가입과 동시에 OAuth 연동까지 생성
      if (pending) {
        await prisma.oAuthAccount.upsert({
          where: { provider_providerUserId: { provider: pending.provider, providerUserId: pending.providerUserId } },
          update: { userId: user.id },
          create: { provider: pending.provider, providerUserId: pending.providerUserId, userId: user.id },
        });
      }

      // 세션 생성
      await createSession(user.id);
    } catch (dbError) {
      // DB 연결 실패 시 임시 세션 생성 (개발/테스트용)
      console.error("DB error during signup, creating temporary session:", dbError);
      
      // 임시 사용자 ID 생성
      const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        await createSession(tempUserId);
      } catch {
        // 세션 생성도 실패하면 그냥 성공 응답만 반환
        console.error("Session creation also failed");
      }

      return NextResponse.json({ 
        ok: true,
        user: {
          name: name,
          profileImg: null,
        },
        warning: "DB_UNAVAILABLE"
      });
    }

    return NextResponse.json({ 
      ok: true,
      user: {
        name: user.name,
        profileImg: user.profileImageUrl,
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

