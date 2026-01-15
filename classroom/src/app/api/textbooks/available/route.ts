import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  const now = new Date();
  const TEST_TITLE_MARKER = "T 교재";

  const textbooksRaw = await prisma.textbook.findMany({
    where: { isPublished: true, NOT: [{ title: { contains: TEST_TITLE_MARKER } }] },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      price: true,
      imwebProdCode: true,
    },
  });

  // 게스트(비로그인): 공개(=paywall 없는) 교재만 노출
  if (!user) {
    const textbooks = textbooksRaw
      .filter((t) => {
        const isPaywalled =
          t.imwebProdCode != null && t.imwebProdCode.length > 0 && !(typeof t.price === "number" && t.price === 0);
        return !isPaywalled;
      })
      .map((t) => ({ id: t.id, title: t.title }));
    return NextResponse.json({ ok: true, textbooks });
  }

  // 관리자는 다운로드/보기 권한이 항상 있으므로 별도 entitlement 체크 없이 모두 반환
  if (user.isAdmin) {
    return NextResponse.json({ ok: true, textbooks: textbooksRaw.map((t) => ({ id: t.id, title: t.title })) });
  }

  const paywalledIds = textbooksRaw
    .filter((t) => t.imwebProdCode != null && t.imwebProdCode.length > 0 && !(typeof t.price === "number" && t.price === 0))
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

  // 번들(상품) entitlement로 포함되는 교재(relatedTextbookIds)도 접근 가능한 교재로 간주
  try {
    const activeParents = await prisma.textbookEntitlement.findMany({
      where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
      select: { textbookId: true },
    });
    const parentIds = activeParents.map((p) => p.textbookId);
    if (parentIds.length > 0) {
      try {
        const parents = await prisma.textbook.findMany({
          where: { id: { in: parentIds } },
          select: { relatedTextbookIds: true },
        });
        for (const p of parents as any[]) {
          const raw = p?.relatedTextbookIds;
          const ids = Array.isArray(raw) ? raw : null;
          if (!ids) continue;
          for (const tid of ids) {
            if (typeof tid === "string" && tid) entitledIdSet.add(tid);
          }
        }
      } catch {
        // relatedTextbookIds 컬럼이 없을 수 있음 → 폴백: 부모별 raw 조회
        for (const pid of parentIds) {
          try {
            const rows = (await prisma.$queryRawUnsafe(
              'SELECT "relatedTextbookIds" FROM "Textbook" WHERE "id" = $1',
              pid
            )) as any[];
            const raw = rows?.[0]?.relatedTextbookIds;
            const ids = Array.isArray(raw) ? raw : null;
            if (!ids) continue;
            for (const tid of ids) {
              if (typeof tid === "string" && tid) entitledIdSet.add(tid);
            }
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }

  const textbooks = textbooksRaw
    .filter((t) => {
      const isPaywalled =
        t.imwebProdCode != null && t.imwebProdCode.length > 0 && !(typeof t.price === "number" && t.price === 0);
      if (!isPaywalled) return true;
      return entitledIdSet.has(t.id);
    })
    .map((t) => ({ id: t.id, title: t.title }));

  return NextResponse.json({ ok: true, textbooks });
}


