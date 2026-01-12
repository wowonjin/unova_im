import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import fs from "node:fs/promises";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  const client = req.headers.get("x-unova-client") || "";
  return accept.includes("application/json") || client === "1";
}

export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  const json = wantsJson(req);
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const tb = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true, storedPath: true },
  });
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // Prisma schema와 DB 스키마가 불일치하는 환경(P2022)에서는
  // delete()가 기본으로 "전체 컬럼 select"를 시도하면서 500이 날 수 있어,
  // 반드시 최소 select로 삭제합니다.
  await prisma.textbook.delete({ where: { id: tb.id }, select: { id: true } });

  // 외부 URL 교재는 서버 파일이 없으므로 파일 삭제 스킵
  if (/^https?:\/\//i.test(tb.storedPath)) {
    return json
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
  }

  try {
    const filePath = safeJoin(getStorageRoot(), tb.storedPath);
    await fs.unlink(filePath);
  } catch {
    // ignore
  }

  return json
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}


