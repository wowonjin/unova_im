import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const Schema = z.object({
  teacherId: z.string().min(1),
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  // true면 임시 비밀번호를 생성해 반환 (1회)
  generatePassword: z.boolean().optional(),
});

function generateTempPassword() {
  // URL-safe, 전달하기 쉬운 임시 비밀번호
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(14);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function ensureTeacherAccountColumns() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "accountUserId" TEXT;');
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { teacherId, email, generatePassword } = parsed.data;

    // Teacher 존재 확인
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true },
    });
    if (!teacher) {
      return NextResponse.json({ ok: false, error: "TEACHER_NOT_FOUND" }, { status: 404 });
    }

    // 계정(유저) upsert
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: teacher.name },
      select: { id: true, email: true, name: true },
    });

    // Prisma upsert에서 조건부 update가 애매해서 2차로 보정
    try {
      const u2 = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
      if (!u2?.name && teacher.name) {
        await prisma.user.update({ where: { id: user.id }, data: { name: teacher.name } });
      }
    } catch {
      // ignore
    }

    // 필요 시 임시 비밀번호 생성/세팅
    let issuedPassword: string | null = null;
    if (generatePassword) {
      issuedPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(issuedPassword, 10);
      const passwordCiphertext = encryptPassword(issuedPassword);
      await prisma.emailCredential.upsert({
        where: { userId: user.id },
        update: { passwordHash, passwordCiphertext },
        create: { userId: user.id, passwordHash, passwordCiphertext },
      });
    }

    await ensureTeacherAccountColumns();
    // Teacher -> User 연결
    await prisma.$executeRawUnsafe('UPDATE "Teacher" SET "accountUserId" = $2 WHERE "id" = $1', teacherId, user.id);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
      ...(issuedPassword ? { password: issuedPassword } : {}),
    });
  } catch (e) {
    console.error("[admin/teachers/link-account] error:", e);
    return NextResponse.json({ ok: false, error: "LINK_FAILED" }, { status: 500 });
  }
}

