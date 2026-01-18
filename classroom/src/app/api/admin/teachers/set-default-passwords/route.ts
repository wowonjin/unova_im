import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const DEFAULT_TEACHER_PASSWORD = "unovaadmin";

export async function POST() {
  try {
    await requireAdminUser();

    // Ensure column exists in environments without migration
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "accountUserId" TEXT;');
    } catch {
      // ignore
    }

    // teacher account userIds
    const rows = (await prisma.$queryRawUnsafe(
      'SELECT DISTINCT "accountUserId" FROM "Teacher" WHERE "accountUserId" IS NOT NULL'
    )) as Array<{ accountUserId: string | null }>;
    const userIds = rows.map((r) => r.accountUserId).filter((v): v is string => typeof v === "string" && v.length > 0);
    if (userIds.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    const passwordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, 10);
    const passwordCiphertext = encryptPassword(DEFAULT_TEACHER_PASSWORD);

    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        await tx.emailCredential.upsert({
          where: { userId },
          update: { passwordHash, passwordCiphertext },
          create: { userId, passwordHash, passwordCiphertext },
        });
        updated += 1;
      }
    });

    return NextResponse.json({ ok: true, updated, password: DEFAULT_TEACHER_PASSWORD });
  } catch (e) {
    console.error("[admin/teachers/set-default-passwords] error:", e);
    return NextResponse.json({ ok: false, error: "SET_DEFAULT_PASSWORDS_FAILED" }, { status: 500 });
  }
}

