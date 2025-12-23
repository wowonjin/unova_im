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
  const refererRaw = req.headers.get("referer") || "/admin/courses";
  
  // referer URL에서 기존 쿼리 파라미터 유지
  const refererUrl = new URL(refererRaw, req.url);
  const buildRedirect = (param: string, value: string) => {
    const url = new URL(refererUrl.pathname, req.url);
    // 기존 쿼리 파라미터 복사 (enroll 제외)
    refererUrl.searchParams.forEach((v, k) => {
      if (k !== "enroll") url.searchParams.set(k, v);
    });
    url.searchParams.set(param, value);
    return url;
  };
  
  const raw = await req.formData().catch(() => null);
  if (!raw) {
    return NextResponse.redirect(buildRedirect("enroll", "error"));
  }
  
  const parsed = Schema.safeParse({
    enrollmentId: raw.get("enrollmentId"),
  });
  
  if (!parsed.success) {
    return NextResponse.redirect(buildRedirect("enroll", "error"));
  }
  
  const { enrollmentId } = parsed.data;
  
  // 등록 확인 (소유권 검증)
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { select: { ownerId: true } } },
  });
  
  if (!enrollment || enrollment.course.ownerId !== teacher.id) {
    return NextResponse.redirect(buildRedirect("enroll", "not_found"));
  }
  
  // 삭제
  await prisma.enrollment.delete({
    where: { id: enrollmentId },
  });
  
  return NextResponse.redirect(buildRedirect("enroll", "removed"));
}
