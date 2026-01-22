import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  const client = req.headers.get("x-unova-client") || "";
  return accept.includes("application/json") || client === "1";
}

export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const admin = await requireAdminUser();
  const json = wantsJson(req);
  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const tb = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });
  if (!tb) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  if (tb.ownerId !== admin.id) {
    await prisma.textbook.update({
      where: { id: tb.id },
      data: { ownerId: admin.id },
      select: { id: true },
    });
  }

  return json
    ? NextResponse.json({ ok: true, ownerId: admin.id })
    : NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}
