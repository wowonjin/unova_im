import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import AdminTextbooksClient from "./AdminTextbooksClient";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";

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
  }> = [];

  try {
    saleItems = await prisma.textbook.findMany({
      where: {
        ownerId: teacher.id,
        OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
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
        OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
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
        saleItems={saleItemsWithDefaults as any} 
        textbookOptions={textbookOptions} 
      />
    </AppShell>
  );
}
