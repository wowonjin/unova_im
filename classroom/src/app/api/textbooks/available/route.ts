import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  const now = new Date();

  const textbooksRaw = await prisma.textbook.findMany({
    where: { isPublished: true },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      imwebProdCode: true,
    },
  });

  // 게스트(비로그인): 공개(=paywall 없는) 교재만 노출
  if (!user) {
    const textbooks = textbooksRaw
      .filter((t) => t.imwebProdCode == null || t.imwebProdCode.length === 0)
      .map((t) => ({ id: t.id, title: t.title }));
    return NextResponse.json({ ok: true, textbooks });
  }

  // 관리자는 다운로드/보기 권한이 항상 있으므로 별도 entitlement 체크 없이 모두 반환
  if (user.isAdmin) {
    return NextResponse.json({ ok: true, textbooks: textbooksRaw.map((t) => ({ id: t.id, title: t.title })) });
  }

  const paywalledIds = textbooksRaw
    .filter((t) => t.imwebProdCode != null && t.imwebProdCode.length > 0)
    .map((t) => t.id);

  const entitledIdSet =
    paywalledIds.length > 0
      ? new Set(
          (
            await prisma.textbookEntitlement.findMany({
              where: { userId: user.id, textbookId: { in: paywalledIds }, status: "ACTIVE", endAt: { gt: now } },
              select: { textbookId: true },
            })
          ).map((e) => e.textbookId)
        )
      : new Set<string>();

  const textbooks = textbooksRaw
    .filter((t) => {
      const isPaywalled = t.imwebProdCode != null && t.imwebProdCode.length > 0;
      if (!isPaywalled) return true;
      return entitledIdSet.has(t.id);
    })
    .map((t) => ({ id: t.id, title: t.title }));

  return NextResponse.json({ ok: true, textbooks });
}


