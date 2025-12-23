import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  enrollmentId: z.string().min(1),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const referer = req.headers.get("referer") || "/admin/courses";
  
  const raw = await req.formData().catch(() => null);
  if (!raw) {
    return NextResponse.redirect(new URL(`${referer}?enroll=error`, req.url));
  }
  
  const parsed = Schema.safeParse({
    enrollmentId: raw.get("enrollmentId"),
  });
  
  if (!parsed.success) {
    return NextResponse.redirect(new URL(`${referer}?enroll=error`, req.url));
  }
  
  const { enrollmentId } = parsed.data;
  
  // 등록 확인 (소유권 검증)
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { select: { ownerId: true } } },
  });
  
  if (!enrollment || enrollment.course.ownerId !== teacher.id) {
    return NextResponse.redirect(new URL(`${referer}?enroll=not_found`, req.url));
  }
  
  // 삭제
  await prisma.enrollment.delete({
    where: { id: enrollmentId },
  });
  
  return NextResponse.redirect(new URL(`${referer}?enroll=removed`, req.url));
}

