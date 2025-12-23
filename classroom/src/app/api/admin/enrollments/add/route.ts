import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const referer = req.headers.get("referer") || "/admin/courses";
  
  const raw = await req.formData().catch(() => null);
  if (!raw) {
    return NextResponse.redirect(new URL(`${referer}?enroll=error`, req.url));
  }
  
  const parsed = Schema.safeParse({
    courseId: raw.get("courseId"),
    email: raw.get("email"),
  });
  
  if (!parsed.success) {
    return NextResponse.redirect(new URL(`${referer}?enroll=invalid`, req.url));
  }
  
  const { courseId, email } = parsed.data;
  
  // 강좌 확인
  const course = await prisma.course.findUnique({
    where: { id: courseId, ownerId: teacher.id },
    select: { id: true, enrollmentDays: true },
  });
  
  if (!course) {
    return NextResponse.redirect(new URL(`${referer}?enroll=not_found`, req.url));
  }
  
  // 사용자 조회 또는 생성
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: { email },
      select: { id: true },
    });
  }
  
  // 이미 등록되어 있는지 확인
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  
  if (existing) {
    // 기존 등록이 있으면 갱신
    const now = new Date();
    const newEndAt = new Date(now.getTime() + course.enrollmentDays * 24 * 60 * 60 * 1000);
    
    await prisma.enrollment.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        startAt: now,
        endAt: newEndAt,
      },
    });
  } else {
    // 새로 등록
    const now = new Date();
    const endAt = new Date(now.getTime() + course.enrollmentDays * 24 * 60 * 60 * 1000);
    
    await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        status: "ACTIVE",
        startAt: now,
        endAt,
      },
    });
  }
  
  return NextResponse.redirect(new URL(`${referer}?enroll=success`, req.url));
}

