import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  memberId: z.string().min(1),
  field: z.enum(["name", "phone"]),
  value: z.string(),
});

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { memberId, field, value } = parsed.data;

    await prisma.user.update({
      where: { id: memberId },
      data: { [field]: value.trim() || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member update error:", error);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }
}

