import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });
const BodySchema = z.object({
  sizeBytes: z.number().int().min(0).max(1_000_000_000).optional(),
  pageCount: z.number().int().min(1).max(50_000).nullable().optional(),
  thumbnailDataUrl: z.string().min(1).max(500_000).optional(),
});

/**
 * POST /api/admin/textbooks/[textbookId]/update-metadata-client
 * - 클라이언트(pdf.js)에서 계산한 메타데이터(페이지 수/썸네일 등)를 DB에 반영
 * - files 컬럼이 존재하면 대표 파일(0번)도 함께 동기화(가능한 경우)
 */
export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await requireAdminUser();
  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const tb = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });
  if (!tb || tb.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof body.data.sizeBytes === "number") updateData.sizeBytes = body.data.sizeBytes;
  if (body.data.pageCount !== undefined) updateData.pageCount = body.data.pageCount;
  if (typeof body.data.thumbnailDataUrl === "string") updateData.thumbnailUrl = body.data.thumbnailDataUrl;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  // files 컬럼이 있는 경우: 대표 파일(0번)도 동기화
  try {
    const withFiles = await prisma.textbook.findUnique({ where: { id: tb.id }, select: { id: true, files: true } });
    const list = Array.isArray((withFiles as any)?.files) ? (((withFiles as any).files) as any[]) : null;
    if (list && list.length > 0 && list[0] && typeof list[0] === "object") {
      const next = list.slice();
      next[0] = {
        ...next[0],
        ...(typeof updateData.sizeBytes === "number" ? { sizeBytes: updateData.sizeBytes } : null),
        ...(updateData.pageCount !== undefined ? { pageCount: updateData.pageCount } : null),
      };
      await prisma.textbook.update({
        where: { id: tb.id },
        data: { ...(updateData as never), files: next as any },
      });
      return NextResponse.json({ ok: true, updated: true });
    }
  } catch {
    // ignore: files 컬럼이 없거나 select 실패
  }

  // 폴백: 대표 컬럼만 업데이트
  try {
    await prisma.textbook.update({ where: { id: tb.id }, data: updateData as never });
  } catch (e) {
    console.error("[update-metadata-client] textbook.update failed:", e);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: true });
}

