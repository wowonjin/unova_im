import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { z } from "zod";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });
const BodySchema = z.object({
  thumbnailDataUrl: z.string().min(1).max(500_000), // ~375KB base64 limit
});

/**
 * POST /api/admin/textbooks/[textbookId]/thumbnail
 * 클라이언트에서 생성한 썸네일 data URL을 저장
 */
export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { textbookId } = ParamsSchema.parse(await ctx.params);

  // 요청 본문 파싱
  let body: { thumbnailDataUrl: string };
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  // 교재 소유권 확인
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });

  if (!textbook || textbook.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 썸네일 저장
  await prisma.textbook.update({
    where: { id: textbookId },
    data: { thumbnailUrl: body.thumbnailDataUrl },
  });

  return NextResponse.json({ ok: true });
}

