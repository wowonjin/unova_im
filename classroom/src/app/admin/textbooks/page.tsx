import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import AdminTextbooksClient from "./AdminTextbooksClient";

export const dynamic = "force-dynamic";

export default async function AdminTextbooksPage() {
  const teacher = await requireAdminUser();

  let saleItems: Array<{
    id: string;
    title: string;
    originalName: string;
    sizeBytes: number;
    createdAt: Date;
    isPublished: boolean;
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
        thumbnailUrl: true,
        entitlementDays: true,
        teacherName: true,
        subjectName: true,
        price: true,
        originalPrice: true,
      },
    });
  } catch (e) {
    console.error("[AdminTextbooksPage] textbook.findMany failed:", e);
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
