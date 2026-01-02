import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ noticeId: z.string().min(1) });

export async function POST(_req: Request, ctx: { params: Promise<{ noticeId: string }> }) {
  const user = await requireCurrentUser();
  if (!user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { noticeId } = ParamsSchema.parse(await ctx.params);

  await prisma.notice.delete({ where: { id: noticeId } });
  return NextResponse.json({ ok: true });
}


