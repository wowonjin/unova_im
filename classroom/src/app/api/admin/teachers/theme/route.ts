import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  slug: z.string().min(1).max(128),
  // 과목명도 개인 페이지에서 같이 바꿀 수 있게 지원
  subjectName: z.string().trim().min(1).max(64).optional(),
  // 과목명 텍스트 색상
  subjectTextColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  pageBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  newsBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
});

export async function POST(req: Request) {
  await requireAdminUser();

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  try {
    // Ensure optional column exists (deployment-safe; avoids Prisma migrations).
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "subjectTextColor" TEXT;');
    } catch {
      // ignore
    }
    await prisma.teacher.update({
      where: { slug: parsed.data.slug },
      data: {
        ...(typeof parsed.data.subjectName === "string" ? { subjectName: parsed.data.subjectName } : {}),
        subjectTextColor: parsed.data.subjectTextColor,
        pageBgColor: parsed.data.pageBgColor,
        newsBgColor: parsed.data.newsBgColor,
      } as any,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 400 });
  }
}


