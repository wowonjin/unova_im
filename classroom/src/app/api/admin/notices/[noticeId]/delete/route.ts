import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ noticeId: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ noticeId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { noticeId } = ParamsSchema.parse(await ctx.params);

  const n = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { id: true, authorId: true },
  });
  if (!n || n.authorId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.notice.delete({ where: { id: n.id } });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/notices", req.url));
}


