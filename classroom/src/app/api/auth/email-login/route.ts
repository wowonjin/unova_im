import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

// 관리자 계정 설정
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

const Schema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // 관리자 계정 로그인 체크
    if (email === ADMIN_EMAIL.toLowerCase().trim()) {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ ok: false, error: "INVALID_PASSWORD" }, { status: 401 });
      }

      // 관리자 계정 upsert (없으면 생성)
      const adminUser = await prisma.user.upsert({
        where: { email },
        update: { lastLoginAt: new Date() },
        create: { 
          email, 
          name: "관리자",
          lastLoginAt: new Date() 
        },
        select: { id: true, name: true, profileImageUrl: true },
      });

      // 세션 생성
      await createSession(adminUser.id);

      return NextResponse.json({ 
        ok: true,
        user: {
          name: adminUser.name,
          profileImg: adminUser.profileImageUrl,
        }
      });
    }

    // 일반 사용자 로그인 (기존 로직)
    // DB에서 사용자 조회 (웹훅으로 동기화된 회원만 존재)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, profileImageUrl: true },
    });

    if (!user) {
      // DB에 없는 회원 = 아임웹에서 동기화되지 않은 회원
      return NextResponse.json({ ok: false, error: "NOT_REGISTERED" }, { status: 404 });
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 세션 생성 (6시간 유효)
    await createSession(user.id);

    return NextResponse.json({ 
      ok: true,
      user: {
        name: user.name,
        profileImg: user.profileImageUrl,
      }
    });
  } catch (error) {
    console.error("Email login error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

