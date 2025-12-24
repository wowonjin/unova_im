import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  memberId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { memberId } = parsed.data;

    // 자기 자신은 삭제 불가
    if (memberId === admin.id) {
      return NextResponse.json({ ok: false, error: "CANNOT_DELETE_SELF" }, { status: 400 });
    }

    // 회원 삭제 (관련 데이터는 onDelete: Cascade로 자동 삭제)
    await prisma.user.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member delete error:", error);
    return NextResponse.json({ ok: false, error: "DELETE_FAILED" }, { status: 500 });
  }
}

