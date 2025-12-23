import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
});

/**
 * 6자리 OTP 코드 생성
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
        { ok: false, error: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // 이전 미사용 코드 삭제
    await prisma.otpCode.deleteMany({
      where: {
        email,
        usedAt: null,
      },
    });

    // 새 코드 생성
    const code = generateOtpCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분

    await prisma.otpCode.create({
      data: {
        email,
        codeHash,
        expiresAt,
      },
    });

    // 이메일 발송
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json(
        { ok: false, error: "EMAIL_CONFIG_ERROR" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@unova.co.kr",
        to: email,
        subject: "[유노바] 로그인 인증 코드",
        html: `
          <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://unova.co.kr/images/logo.png" alt="UNOVA" style="height: 40px;" />
            </div>
            <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center; margin-bottom: 16px;">
              로그인 인증 코드
            </h1>
            <p style="font-size: 16px; color: #666; text-align: center; margin-bottom: 32px;">
              아래 인증 코드를 입력하여 로그인하세요.
            </p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">
                ${code}
              </span>
            </div>
            <p style="font-size: 14px; color: #999; text-align: center;">
              이 코드는 10분 동안 유효합니다.<br/>
              본인이 요청하지 않았다면 이 이메일을 무시하세요.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      return NextResponse.json(
        { ok: false, error: "EMAIL_SEND_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request code error:", error);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

