import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  memberId: z.string().min(1),
  textbookId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { memberId, textbookId } = parsed.data;

    // 교재 조회하여 entitlementDays 가져오기
    const textbook = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { entitlementDays: true },
    });

    if (!textbook) {
      return NextResponse.json({ ok: false, error: "TEXTBOOK_NOT_FOUND" }, { status: 404 });
    }

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + textbook.entitlementDays * 24 * 60 * 60 * 1000);

    await prisma.textbookEntitlement.upsert({
      where: { userId_textbookId: { userId: memberId, textbookId } },
      update: { status: "ACTIVE", startAt, endAt },
      create: { userId: memberId, textbookId, status: "ACTIVE", startAt, endAt },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member textbook add error:", error);
    return NextResponse.json({ ok: false, error: "ADD_FAILED" }, { status: 500 });
  }
}

