import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  const client = req.headers.get("x-unova-client") || "";
  return accept.includes("application/json") || client === "1";
}

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const json = wantsJson(req);
  const referer = req.headers.get("referer") || "/admin/textbooks";

  const form = await req.formData().catch(() => null);
  if (!form) {
    return json
      ? NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 })
      : NextResponse.redirect(new URL(`${referer}?review=error`, req.url));
  }

  const reviewId = form.get("reviewId") as string | null;
  if (!reviewId) {
    return json
      ? NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 })
      : NextResponse.redirect(new URL(`${referer}?review=error`, req.url));
  }

  // 후기 조회 및 소유권 확인
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      textbookId: true,
      textbook: { select: { ownerId: true } },
    },
  });

  if (!review || !review.textbook || review.textbook.ownerId !== teacher.id) {
    return json
      ? NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
      : NextResponse.redirect(new URL(`${referer}?review=error`, req.url));
  }

  // 후기 삭제
  await prisma.review.delete({ where: { id: reviewId } });

  return json
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(`${referer}?review=removed`, req.url));
}
