import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  teacherId: z.string().min(1),
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
      // 운영에서는 최소 정보만 반환(디버그 노출 방지)
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
      }
      const receivedType = raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw;
      const receivedKeys = raw && typeof raw === "object" && !Array.isArray(raw) ? Object.keys(raw as any) : [];
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST", receivedType, receivedKeys }, { status: 400 });
    }

    await ensureTeacherAccountColumns();

    const rows = (await prisma.$queryRawUnsafe(
      'SELECT "id", "name", "accountUserId" FROM "Teacher" WHERE "id" = $1 LIMIT 1',
      parsed.data.teacherId
    )) as any[];
    const r = rows?.[0];
    if (!r) {
      return NextResponse.json({ ok: false, error: "TEACHER_NOT_FOUND" }, { status: 404 });
    }
    const teacherName = String(r.name ?? "").trim();
    const accountUserId = String(r.accountUserId ?? "").trim();
    if (!accountUserId) {
      return NextResponse.json({ ok: false, error: "TEACHER_ACCOUNT_NOT_LINKED" }, { status: 400 });
    }
    if (!teacherName) {
      return NextResponse.json({ ok: false, error: "TEACHER_NAME_EMPTY" }, { status: 400 });
    }

    const [courses, textbooks] = await Promise.all([
      prisma.course.updateMany({
        where: {
          teacherName,
          OR: [{ ownerId: admin.id }, { ownerId: null }],
        },
        data: { ownerId: accountUserId },
      }),
      prisma.textbook.updateMany({
        where: {
          teacherName,
          ownerId: admin.id,
        },
        data: { ownerId: accountUserId },
      }),
    ]);

    return NextResponse.json({ ok: true, updated: { courses: courses.count, textbooks: textbooks.count } });
  } catch (e) {
    console.error("[admin/teachers/auto-assign-by-name] error:", e);
    return NextResponse.json({ ok: false, error: "AUTO_ASSIGN_FAILED" }, { status: 500 });
  }
}

