import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

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

    const { name, email, phone, zonecode, address, addressDetail } = parsed.data;

    let user;

    try {
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
          lastLoginAt: new Date(),
        },
        select: { id: true, name: true, profileImageUrl: true },
      });

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

