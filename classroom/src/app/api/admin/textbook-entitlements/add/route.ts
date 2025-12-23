import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const referer = req.headers.get("referer") || "/admin/textbooks";

  const raw = await req.formData().catch(() => null);
  if (!raw) {
    return NextResponse.redirect(new URL(`${referer}?entitle=error`, req.url));
  }

  const parsed = Schema.safeParse({
    textbookId: raw.get("textbookId"),
    email: raw.get("email"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`${referer}?entitle=invalid`, req.url));
  }

  const { textbookId, email } = parsed.data;

  // 교재 확인
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true, entitlementDays: true },
  });

  if (!textbook) {
    return NextResponse.redirect(new URL(`${referer}?entitle=error`, req.url));
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
  const existing = await prisma.textbookEntitlement.findUnique({
    where: { userId_textbookId: { userId: user.id, textbookId: textbook.id } },
  });

  if (existing) {
    // 기존 등록이 있으면 갱신
    const now = new Date();
    const newEndAt = new Date(now.getTime() + textbook.entitlementDays * 24 * 60 * 60 * 1000);

    await prisma.textbookEntitlement.update({
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
    const endAt = new Date(now.getTime() + textbook.entitlementDays * 24 * 60 * 60 * 1000);

    await prisma.textbookEntitlement.create({
      data: {
        userId: user.id,
        textbookId: textbook.id,
        status: "ACTIVE",
        startAt: now,
        endAt,
      },
    });
  }

  return NextResponse.redirect(new URL(`${referer}?entitle=success`, req.url));
}

