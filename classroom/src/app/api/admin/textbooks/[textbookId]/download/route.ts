import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function parseFileIndex(req: Request): number | null {
  try {
    const u = new URL(req.url);
    const raw = u.searchParams.get("file");
    if (raw == null || raw.trim() === "") return null;
    if (!/^\d+$/.test(raw.trim())) return null;
    const n = parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  // NOTE: _req는 아래에서 query param 파싱을 위해 사용합니다.
  const req = _req;
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const fileIndex = parseFileIndex(req);

  // NOTE: files 컬럼이 없는 환경(마이그레이션 미적용)일 수 있어 try/catch로 폴백
  let tb:
    | { id: string; ownerId: string; title: string; storedPath: string; originalName: string; mimeType: string; files?: unknown }
    | null = null;

  try {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true, ownerId: true, title: true, storedPath: true, originalName: true, mimeType: true, files: true },
    });
  } catch {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: { id: true, ownerId: true, title: true, storedPath: true, originalName: true, mimeType: true },
    });
  }
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let storedPath = tb.storedPath;
  let originalName = tb.originalName;
  let mimeType = tb.mimeType;
  const files = Array.isArray((tb as any).files) ? ((tb as any).files as any[]) : null;
  if (fileIndex != null && files && files.length > 0) {
    const f = files[fileIndex];
    if (!f || typeof f !== "object") return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (typeof f.storedPath === "string" && f.storedPath) storedPath = f.storedPath;
    if (typeof f.originalName === "string" && f.originalName) originalName = f.originalName;
    if (typeof f.mimeType === "string" && f.mimeType) mimeType = f.mimeType;
  }

  // 외부 URL(구글 콘솔 업로드)인 경우 그대로 리다이렉트
  if (/^https?:\/\//i.test(storedPath)) {
    return NextResponse.redirect(storedPath);
  }

  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), storedPath);
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers();
  headers.set("content-type", mimeType || "application/octet-stream");
  headers.set("content-length", String(stat.size));
  headers.set("content-disposition", `attachment; filename="${encodeURIComponent(originalName || tb.title)}"`);

  return new NextResponse(webStream, { status: 200, headers });
}


