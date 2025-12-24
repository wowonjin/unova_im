import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  enrollmentId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { enrollmentId } = parsed.data;

    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member enrollment remove error:", error);
    return NextResponse.json({ ok: false, error: "REMOVE_FAILED" }, { status: 500 });
  }
}

