import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

export async function GET(_req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const tb = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true, title: true, storedPath: true, originalName: true, mimeType: true },
  });
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 외부 URL(구글 콘솔 업로드)인 경우 그대로 리다이렉트
  if (/^https?:\/\//i.test(tb.storedPath)) {
    return NextResponse.redirect(tb.storedPath);
  }

  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), tb.storedPath);
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers();
  headers.set("content-type", tb.mimeType || "application/octet-stream");
  headers.set("content-length", String(stat.size));
  headers.set("content-disposition", `attachment; filename="${encodeURIComponent(tb.originalName || tb.title)}"`);

  return new NextResponse(webStream, { status: 200, headers });
}


