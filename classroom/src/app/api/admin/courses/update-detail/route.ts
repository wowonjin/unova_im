import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  price: z.string().transform((s) => (s ? parseInt(s) : null)),
  originalPrice: z.string().transform((s) => (s ? parseInt(s) : null)),
  tags: z.string().transform((s) => 
    s.split(",").map((t) => t.trim()).filter(Boolean)
  ),
  benefits: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData();
  const data: Record<string, string> = {};
  
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      data[key] = value;
    }
  }

  const parsed = Schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const { courseId, price, originalPrice, tags, benefits } = parsed.data;

  // Verify ownership
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, ownerId: true },
  });

  // NOTE: 기존 데이터에 ownerId가 비어있는 강좌가 있을 수 있어(legacy/마이그레이션)
  // 관리자 계정은 소유자 불일치/NULL이어도 업데이트를 허용합니다.
  if (!course || (!teacher.isAdmin && course.ownerId !== teacher.id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Calculate daily price
  const dailyPrice = price ? Math.round(price / 30) : null;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      price,
      originalPrice,
      dailyPrice,
      tags,
      benefits,
    } as never,
  });

  return NextResponse.json({ ok: true });
}

