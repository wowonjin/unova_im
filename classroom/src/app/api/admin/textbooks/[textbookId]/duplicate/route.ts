import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ textbookId: string }> }
) {
  const teacher = await requireAdminUser();
  const { textbookId } = await ctx.params;

  let source:
    | {
        id: string;
        title: string;
        teacherName: string | null;
        teacherImageUrl?: string | null;
        teacherTitle: string | null;
        teacherDescription: string | null;
        subjectName: string | null;
        storedPath: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        pageCount: number | null;
        isPublished: boolean;
        imwebProdCode: string | null;
        thumbnailUrl: string | null;
        entitlementDays: number;
        composition: string | null;
        textbookType: string | null;
        price: number | null;
        originalPrice: number | null;
        tags: unknown;
        benefits: unknown;
        features: unknown;
        description: string | null;
        relatedTextbookIds: unknown;
        extraOptions: unknown;
        files: unknown;
      }
    | null = null;

  try {
    source = await prisma.textbook.findFirst({
      where: { id: textbookId, ownerId: teacher.id },
      select: {
        id: true,
        title: true,
        teacherName: true,
        teacherImageUrl: true,
        teacherTitle: true,
        teacherDescription: true,
        subjectName: true,
        storedPath: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        pageCount: true,
        isPublished: true,
        imwebProdCode: true,
        thumbnailUrl: true,
        entitlementDays: true,
        composition: true,
        textbookType: true,
        price: true,
        originalPrice: true,
        tags: true,
        benefits: true,
        features: true,
        extraOptions: true,
        description: true,
        relatedTextbookIds: true,
        files: true,
      },
    });
  } catch {
    // migration mismatch fallback (copy minimal core fields)
    source = await prisma.textbook.findFirst({
      where: { id: textbookId, ownerId: teacher.id },
      select: {
        id: true,
        title: true,
        teacherName: true,
        teacherTitle: true,
        teacherDescription: true,
        subjectName: true,
        storedPath: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        isPublished: true,
        imwebProdCode: true,
        thumbnailUrl: true,
        entitlementDays: true,
        composition: true,
        textbookType: true,
        price: true,
        originalPrice: true,
        tags: true,
        benefits: true,
        features: true,
        extraOptions: true,
        description: true,
        relatedTextbookIds: true,
      },
    }) as any;
  }

  if (!source) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const newTitle = `${source.title} (복사본)`;

  // NOTE: 리뷰/좋아요/권한/주문 등 연관 데이터는 복사하지 않습니다.
  //       "내용 + 파일 정보"만 동일하게 복제합니다.
  const created = await prisma.textbook.create({
    data: {
      ownerId: teacher.id,
      position: 0,
      title: newTitle,
      teacherName: source.teacherName,
      teacherImageUrl: source.teacherImageUrl,
      teacherTitle: source.teacherTitle,
      teacherDescription: source.teacherDescription,
      subjectName: source.subjectName,
      storedPath: source.storedPath,
      originalName: source.originalName,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
      pageCount: source.pageCount,
      // 원본과 동일하게 복제
      isPublished: source.isPublished,
      imwebProdCode: source.imwebProdCode,
      thumbnailUrl: source.thumbnailUrl,
      entitlementDays: source.entitlementDays ?? 30,
      composition: source.composition,
      textbookType: source.textbookType,
      price: source.price,
      originalPrice: source.originalPrice,
      tags: source.tags as any,
      benefits: source.benefits as any,
      features: source.features as any,
      extraOptions: source.extraOptions as any,
      description: source.description,
      relatedTextbookIds: source.relatedTextbookIds as any,
      files: source.files as any,
      rating: null,
      reviewCount: 0,
      likeCount: 0,
    } as any,
    select: { id: true },
  });

  return NextResponse.json({ ok: true, newId: created.id });
}

