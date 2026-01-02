import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  slug: z.string().min(1).max(128),
  // 과목명도 개인 페이지에서 같이 바꿀 수 있게 지원
  subjectName: z.string().trim().min(1).max(64).optional(),
  pageBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  menuBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  newsBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  ratingBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
});

export async function POST(req: Request) {
  await requireAdminUser();

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  try {
    await prisma.teacher.update({
      where: { slug: parsed.data.slug },
      data: {
        ...(typeof parsed.data.subjectName === "string" ? { subjectName: parsed.data.subjectName } : {}),
        pageBgColor: parsed.data.pageBgColor,
        menuBgColor: parsed.data.menuBgColor,
        newsBgColor: parsed.data.newsBgColor,
        ratingBgColor: parsed.data.ratingBgColor,
      } as any,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 400 });
  }
}


