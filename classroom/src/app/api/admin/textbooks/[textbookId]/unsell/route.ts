import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  const client = req.headers.get("x-unova-client") || "";
  return accept.includes("application/json") || client === "1";
}

/**
 * 판매 목록에서의 "삭제"는 실제 삭제가 아니라 "판매 해제"입니다.
 * - 가격/원가/상품코드 등을 제거하여 판매 목록에서 숨기고
 * - 다시 "등록된 교재 목록"에 나타나게 합니다.
 */
export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  const json = wantsJson(req);
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { textbookId } = ParamsSchema.parse(await ctx.params);

  const tb = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.textbook.update({
    where: { id: tb.id },
    data: {
      price: null,
      originalPrice: null,
      imwebProdCode: null,
      // 판매 페이지에서만 노출되는 값이므로 비공개로 돌립니다.
      isPublished: false,
    },
    select: { id: true },
  });

  return json
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}

