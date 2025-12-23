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

    // 사용자 조회 또는 생성
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email, lastLoginAt: new Date() },
        select: { id: true },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // 세션 생성 (6시간 유효)
    await createSession(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email login error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

