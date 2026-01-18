import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  teacherId: z.string().min(1),
  courseIds: z.array(z.string()).optional(),
  textbookIds: z.array(z.string()).optional(),
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
    await requireAdminUser();
    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { teacherId } = parsed.data;
    const courseIds = (parsed.data.courseIds ?? []).filter((x) => typeof x === "string" && x.trim().length > 0);
    const textbookIds = (parsed.data.textbookIds ?? []).filter((x) => typeof x === "string" && x.trim().length > 0);

    await ensureTeacherAccountColumns();

    const rows = (await prisma.$queryRawUnsafe(
      'SELECT "accountUserId" FROM "Teacher" WHERE "id" = $1 LIMIT 1',
      teacherId
    )) as any[];
    const accountUserId = String(rows?.[0]?.accountUserId ?? "").trim();
    if (!accountUserId) {
      return NextResponse.json({ ok: false, error: "TEACHER_ACCOUNT_NOT_LINKED" }, { status: 400 });
    }

    const [courses, textbooks] = await Promise.all([
      courseIds.length
        ? prisma.course.updateMany({
            where: { id: { in: courseIds } },
            data: { ownerId: accountUserId },
          })
        : Promise.resolve({ count: 0 }),
      textbookIds.length
        ? prisma.textbook.updateMany({
            where: { id: { in: textbookIds } },
            data: { ownerId: accountUserId },
          })
        : Promise.resolve({ count: 0 }),
    ]);

    return NextResponse.json({ ok: true, updated: { courses: courses.count, textbooks: textbooks.count } });
  } catch (e) {
    console.error("[admin/teachers/assign-products] error:", e);
    return NextResponse.json({ ok: false, error: "ASSIGN_FAILED" }, { status: 500 });
  }
}

