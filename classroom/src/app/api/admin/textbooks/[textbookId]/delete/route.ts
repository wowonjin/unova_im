import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import fs from "node:fs/promises";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const tb = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true, storedPath: true },
  });
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.textbook.delete({ where: { id: tb.id } });

  // 외부 URL 교재는 서버 파일이 없으므로 파일 삭제 스킵
  if (/^https?:\/\//i.test(tb.storedPath)) {
    return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
  }

  try {
    const filePath = safeJoin(getStorageRoot(), tb.storedPath);
    await fs.unlink(filePath);
  } catch {
    // ignore
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}


