import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

/**
 * 코드 해시 생성
 */
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const code = parsed.data.code;
    const codeHash = hashCode(code);

    // OTP 코드 확인
    const otpCode = await prisma.otpCode.findFirst({
      where: {
        email,
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpCode) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CODE" },
        { status: 400 }
      );
    }

    // 코드 사용 처리
    await prisma.otpCode.update({
      where: { id: otpCode.id },
      data: { usedAt: new Date() },
    });

    // 사용자 조회 또는 생성
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // 세션 생성
    await createSession(user.id);

    return NextResponse.json({ ok: true, redirect: "/dashboard" });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

