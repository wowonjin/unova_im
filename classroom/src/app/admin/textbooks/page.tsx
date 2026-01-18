import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import AdminTextbooksClient from "./AdminTextbooksClient";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";
import { OrderStatus, ProductType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminTextbooksPage() {
  const teacher = await requireAdminUser();
  await ensureSoldOutColumnsOnce();

  let saleItems: Array<{
    id: string;
    title: string;
    originalName: string;
    sizeBytes: number;
    createdAt: Date;
    isPublished: boolean;
    isSoldOut?: boolean;
    thumbnailUrl: string | null;
    entitlementDays?: number | null;
    teacherName?: string | null;
    subjectName?: string | null;
    price?: number | null;
    originalPrice?: number | null;
    salesCount?: number;
  }> = [];

  try {
    saleItems = await prisma.textbook.findMany({
      where: {
        ownerId: teacher.id,
        // NOTE:
        // 기본적으로 "판매 물품"은 가격/정가가 설정된 교재만 보여줍니다.
        // 다만 운영 중 실수로 price/originalPrice가 null로 저장되면(가격 입력 비움),
        // 스토어/홈/판매목록에서 동시에 "사라진 것처럼" 보이면서 복구가 어려워집니다.
        // 그래서 "공개(isPublished=true)인데 가격이 미설정"인 항목도 판매 목록에 포함시켜
        // 관리자 화면에서 다시 가격을 설정할 수 있게 합니다.
        OR: [{ price: { not: null } }, { originalPrice: { not: null } }, { isPublished: true }],
      },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        position: true,
        title: true,
        originalName: true,
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        isSoldOut: true,
        thumbnailUrl: true,
        entitlementDays: true,
        teacherName: true,
        subjectName: true,
        price: true,
        originalPrice: true,
      },
    });
  } catch (e) {
    // NOTE: Turbopack dev overlay가 server source map 이슈를 일으키는 경우가 있어
    // 에러 객체를 그대로 console.error로 찍지 않습니다(노이즈/오버레이 방지).
    console.warn("[AdminTextbooksPage] textbook.findMany failed. Falling back to createdAt order.");
    saleItems = await prisma.textbook.findMany({
      where: {
        ownerId: teacher.id,
        OR: [{ price: { not: null } }, { originalPrice: { not: null } }, { isPublished: true }],
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        originalName: true,
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        thumbnailUrl: true,
      },
    });
  }

  const saleItemsWithDefaults = saleItems.map((t) => ({
    ...t,
    entitlementDays: (t as { entitlementDays?: number | null }).entitlementDays ?? 30,
    // 구버전 DB(컬럼 없음) or fallback select에서는 isSoldOut이 없을 수 있음
    isSoldOut: (t as any).isSoldOut ?? false,
  }));

  // 판매개수: 주문(결제 완료/부분환불) 기준으로 교재별 주문 수 집계
  // - Order 모델은 "수량(quantity)" 컬럼이 없어서, 현재는 "완료된 주문 건수"를 판매개수로 사용합니다.
  // - 취소/환불/결제대기 주문은 제외합니다.
  const saleItemIds = saleItemsWithDefaults.map((t) => t.id);
  const salesByTextbookId = new Map<string, number>();
  if (saleItemIds.length) {
    const grouped = await prisma.order.groupBy({
      by: ["textbookId"],
      where: {
        productType: ProductType.TEXTBOOK,
        textbookId: { in: saleItemIds },
        status: { in: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED] },
      },
      _count: { _all: true },
    });
    for (const g of grouped) {
      if (typeof g.textbookId === "string") {
        salesByTextbookId.set(g.textbookId, g._count._all);
      }
    }
  }

  const saleItemsWithSales = saleItemsWithDefaults.map((t) => ({
    ...t,
    salesCount: salesByTextbookId.get(t.id) ?? 0,
  }));

  // "교재 등록"(/admin/textbooks/register)로 등록된 교재만 옵션으로 노출
  // - 해당 플로우는 storedPath에 GCS URL(https://storage.googleapis.com/...)을 저장합니다.
  // - 또한 "교재 판매하기"에서 이미 판매 설정(가격/원가)이 들어간 교재는 옵션에서 제외합니다.
  const registeredTextbookWhere = {
    ownerId: teacher.id,
    OR: [
      { storedPath: { contains: "storage.googleapis.com" } },
      { storedPath: { contains: "storage.cloud.google.com" } },
    ],
  } as const;

  const textbookOptions = await prisma.textbook
    .findMany({
      where: {
        ...(registeredTextbookWhere as any),
        price: null,
        originalPrice: null,
      },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, originalName: true },
      take: 300,
    })
    .catch(async () => {
      return await prisma.textbook.findMany({
        where: {
          ...(registeredTextbookWhere as any),
          price: null,
          originalPrice: null,
        },
        orderBy: [{ createdAt: "desc" }],
        select: { id: true, title: true, originalName: true },
        take: 300,
      });
    });

  return (
    <AppShell>
      <AdminTextbooksClient 
        saleItems={saleItemsWithSales as any} 
        textbookOptions={textbookOptions} 
      />
    </AppShell>
  );
}
