import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  memberId: z.string().min(1),
  courseId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { memberId, courseId } = parsed.data;

    // 강좌 조회하여 enrollmentDays 가져오기
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { enrollmentDays: true },
    });

    if (!course) {
      return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });
    }

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + course.enrollmentDays * 24 * 60 * 60 * 1000);

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: memberId, courseId } },
      update: { status: "ACTIVE", startAt, endAt },
      create: { userId: memberId, courseId, status: "ACTIVE", startAt, endAt },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member enrollment add error:", error);
    return NextResponse.json({ ok: false, error: "ADD_FAILED" }, { status: 500 });
  }
}

