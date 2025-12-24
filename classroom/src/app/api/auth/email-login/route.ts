import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const { email } = parsed.data;

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

