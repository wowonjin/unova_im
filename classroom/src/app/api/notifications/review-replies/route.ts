import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const MarkReadSchema = z.object({
  reviewIds: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

// GET: 미확인(읽지 않은) 선생님 답글 알림
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const unreadCount = await prisma.review.count({
    where: {
      userId: user.id,
      isApproved: true,
      teacherReplyAt: { not: null },
      teacherReplyReadAt: null,
    },
  });

  const rows = await prisma.review.findMany({
    where: {
      userId: user.id,
      isApproved: true,
      teacherReplyAt: { not: null },
      teacherReplyReadAt: null,
    },
    orderBy: { teacherReplyAt: "desc" },
    take: 20,
    select: {
      id: true,
      productType: true,
      courseId: true,
      textbookId: true,
      teacherReplyAt: true,
      teacherReplyIsSecret: true,
      course: { select: { title: true, teacherName: true } },
      textbook: { select: { title: true, teacherName: true } },
    },
  });

  const notifications = rows.map((r) => {
    const productId = r.productType === "COURSE" ? r.courseId : r.textbookId;
    const productTitle = r.productType === "COURSE" ? r.course?.title ?? "강좌" : r.textbook?.title ?? "교재";
    const teacherNameRaw = (r.productType === "COURSE" ? r.course?.teacherName : r.textbook?.teacherName) || "선생님";
    const teacherName = teacherNameRaw.replace(/선생님/g, "").trim() ? `${teacherNameRaw.replace(/선생님/g, "").trim()} 선생님` : "선생님";
    return {
      id: r.id,
      productId,
      productTitle,
      teacherName,
      // 작성자는 비밀 답글도 확인 가능하지만, UI는 공통 메시지로 처리합니다.
      isSecret: Boolean(r.teacherReplyIsSecret),
      repliedAtISO: r.teacherReplyAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ ok: true, unreadCount, notifications });
}

// POST: 읽음 처리(전체 또는 특정 리뷰)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = MarkReadSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
  }

  const { reviewIds, all } = parsed.data;
  const now = new Date();

  const whereBase = {
    userId: user.id,
    teacherReplyAt: { not: null as any },
    teacherReplyReadAt: null,
  };

  const where = all
    ? whereBase
    : reviewIds && reviewIds.length > 0
      ? { ...whereBase, id: { in: reviewIds } }
      : null;

  if (!where) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const updated = await prisma.review.updateMany({
    where: where as any,
    data: { teacherReplyReadAt: now },
  });

  return NextResponse.json({ ok: true, updatedCount: updated.count });
}

