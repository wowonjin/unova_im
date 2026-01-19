import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const DEFAULT_TEACHER_PASSWORD = "unovaadmin";

const Schema = z.object({
  teacherId: z.string().min(1),
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  // true면 임시 비밀번호를 생성해 반환 (1회)
  generatePassword: z.boolean().optional(),
});

async function ensureTeacherAccountColumns() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "accountUserId" TEXT;');
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();

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
      // 선생님 계정 비밀번호는 고정값으로 통일
      issuedPassword = DEFAULT_TEACHER_PASSWORD;
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

    // =========================
    // 자동 상품 연동 (이름 기준)
    // - 기존 데이터는 admin이 ownerId로 소유하고, teacherName만 채워진 채로 남아있을 수 있음
    // - 선생님 계정 연결 직후, teacherName이 Teacher.name과 일치하는 상품의 ownerId를 선생님 계정(User.id)로 이관
    // =========================
    try {
      const teacherName = (teacher.name || "").trim();
      if (teacherName) {
        // 강좌: legacy로 ownerId가 NULL인 케이스가 있어 함께 커버
        await prisma.course.updateMany({
          where: {
            teacherName,
            OR: [{ ownerId: admin.id }, { ownerId: null }],
          },
          data: { ownerId: user.id },
        });

        // 교재: ownerId 필수 컬럼이지만, 기존 운영 데이터는 admin 소유로 들어간 경우가 많음
        await prisma.textbook.updateMany({
          where: {
            teacherName,
            ownerId: admin.id,
          },
          data: { ownerId: user.id },
        });
      }
    } catch (e) {
      console.warn("[admin/teachers/link-account] auto-assign-by-name skipped:", e);
    }

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

