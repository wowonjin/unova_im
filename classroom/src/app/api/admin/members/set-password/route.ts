import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const Schema = z.object({
  memberId: z.string().min(1),
  password: z.string().min(8).optional(),
  generate: z.boolean().optional(),
});

function generateTempPassword() {
  // URL-safe, admin이 전달하기 쉬운 임시 비밀번호
  // (길이 12~16 정도, 혼동되는 문자 최소화)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(14);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { memberId, password, generate } = parsed.data;

    const newPassword = generate ? generateTempPassword() : password?.trim();
    if (!newPassword) {
      return NextResponse.json({ ok: false, error: "PASSWORD_REQUIRED" }, { status: 400 });
    }

    // 존재 확인(명확한 에러)
    const user = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const passwordCiphertext = encryptPassword(newPassword);

    await prisma.emailCredential.upsert({
      where: { userId: memberId },
      update: { passwordHash, passwordCiphertext },
      create: { userId: memberId, passwordHash, passwordCiphertext },
    });

    // 보안상 "기존 비밀번호"는 절대 반환하지 않음.
    // generate=true일 때만 새로 만든 임시 비밀번호를 1회 전달.
    return NextResponse.json({
      ok: true,
      ...(generate ? { password: newPassword } : {}),
    });
  } catch (error) {
    console.error("Admin set password error:", error);
    return NextResponse.json({ ok: false, error: "SET_PASSWORD_FAILED" }, { status: 500 });
  }
}

