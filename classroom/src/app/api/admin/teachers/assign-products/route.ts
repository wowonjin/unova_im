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
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedCourseIds" JSONB;');
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedTextbookIds" JSONB;');
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

    // 정책 변경:
    // - 상품 소유권(ownerId)은 admin에 유지
    // - 선생님 콘솔은 Teacher.selectedCourseIds/selectedTextbookIds 기준으로 데이터(주문/정산)만 연동
    const normalizedCourses = Array.from(new Set(courseIds.map((x) => x.trim()).filter(Boolean)));
    const normalizedTextbooks = Array.from(new Set(textbookIds.map((x) => x.trim()).filter(Boolean)));

    await prisma.$executeRawUnsafe(
      'UPDATE "Teacher" SET "selectedCourseIds" = $2::jsonb, "selectedTextbookIds" = $3::jsonb WHERE "id" = $1',
      teacherId,
      JSON.stringify(normalizedCourses),
      JSON.stringify(normalizedTextbooks)
    );

    return NextResponse.json({
      ok: true,
      updated: { courses: normalizedCourses.length, textbooks: normalizedTextbooks.length },
    });
  } catch (e) {
    console.error("[admin/teachers/assign-products] error:", e);
    return NextResponse.json({ ok: false, error: "ASSIGN_FAILED" }, { status: 500 });
  }
}

