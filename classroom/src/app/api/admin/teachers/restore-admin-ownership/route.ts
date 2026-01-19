import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  teacherId: z.string().min(1),
});

async function ensureTeacherColumns() {
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

    await ensureTeacherColumns();

    // Teacher 정보 조회 (계정 연결 + 이름)
    const rows = (await prisma.$queryRawUnsafe(
      'SELECT "id", "name", "accountUserId" FROM "Teacher" WHERE "id" = $1 LIMIT 1',
      parsed.data.teacherId
    )) as any[];
    const r = rows?.[0];
    if (!r) return NextResponse.json({ ok: false, error: "TEACHER_NOT_FOUND" }, { status: 404 });

    const teacherName = String(r.name ?? "").trim();
    const accountUserId = String(r.accountUserId ?? "").trim();
    if (!accountUserId) return NextResponse.json({ ok: false, error: "TEACHER_ACCOUNT_NOT_LINKED" }, { status: 400 });
    if (!teacherName) return NextResponse.json({ ok: false, error: "TEACHER_NAME_EMPTY" }, { status: 400 });

    // 이전에 "소유권을 선생님 계정으로 이동"해버린 데이터를 원복
    // - teacherName이 해당 선생님 이름인 상품 중
    // - ownerId가 선생님 계정(accountUserId)인 항목을 admin.id로 되돌립니다.
    const [courses, textbooks] = await Promise.all([
      prisma.course.updateMany({
        where: { teacherName, ownerId: accountUserId },
        data: { ownerId: admin.id },
      }),
      prisma.textbook.updateMany({
        where: { teacherName, ownerId: accountUserId },
        data: { ownerId: admin.id },
      }),
    ]);

    return NextResponse.json({ ok: true, updated: { courses: courses.count, textbooks: textbooks.count } });
  } catch (e) {
    console.error("[admin/teachers/restore-admin-ownership] error:", e);
    return NextResponse.json({ ok: false, error: "RESTORE_FAILED" }, { status: 500 });
  }
}

