import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const DEFAULT_TEMP_PASSWORD = "a123456";

export async function POST() {
  try {
    await requireAdminUser();

    const users = await prisma.user.findMany({
      where: { emailCredential: { is: null } },
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const passwordHash = await bcrypt.hash(DEFAULT_TEMP_PASSWORD, 10);
    const passwordCiphertext = encryptPassword(DEFAULT_TEMP_PASSWORD);
    const result = await prisma.emailCredential.createMany({
      data: users.map((u) => ({ userId: u.id, passwordHash, passwordCiphertext })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error("Set default passwords error:", error);
    return NextResponse.json({ ok: false, error: "SET_DEFAULT_PASSWORDS_FAILED" }, { status: 500 });
  }
}

