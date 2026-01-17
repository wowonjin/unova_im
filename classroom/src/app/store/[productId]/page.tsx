import Link from "next/link";
import type { Metadata } from "next";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";

// 상품 상세는 공개 데이터이며, DB 조회가 많아 SSR 반복 비용이 큽니다.
// 동적 라우트지만 ISR 캐시를 두면 동일 상품 페이지 재방문/공유 시 체감이 좋아집니다.
export const revalidate = 60;

function getStoreOwnerEmail(): string {
  // 스토어 목록과 동일하게, 하드코딩된 기본 이메일로 owner 필터를 고정하지 않습니다.
  // (ADMIN_EMAIL이 비어있거나 DB owner 이메일과 다르면 공개 상품이 404/폴백으로 떨어질 수 있음)
  return (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
}

let _ensuredCourseAddonsColumns = false;
async function ensureCourseAddonsColumnsOnce() {
  if (_ensuredCourseAddonsColumns) return;
  _ensuredCourseAddonsColumns = true;
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedTextbookIds" JSONB;');
    await prisma.$executeRawUnsafe('ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedCourseIds" JSONB;');
  } catch {
    // ignore (older DBs or restricted DB users). We will fallback gracefully.
  }
}

function toSafeOgDescription(input: string | null | undefined): string | undefined {
  const v = (input ?? "").trim();
  if (!v) return undefined;
  // OG description은 너무 길면 잘릴 수 있어 적당히 제한
  return v.length > 160 ? v.slice(0, 157) + "..." : v;
}

function buildOgImageUrl(path: string): string {
  // metadataBase는 layout.tsx에서 설정되어 있으므로, 여기서는 path(상대경로)만 반환해도 절대 URL로 확장됩니다.
  return path.startsWith("/") ? path : `/${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const storeOwnerEmail = getStoreOwnerEmail();
  const DEFAULT_DESC = "최상위권의 모든 지식을 담은 실전 독학서";

  // 기본값(폴백)
  const base: Metadata = {
    title: "유노바",
    description: DEFAULT_DESC,
    openGraph: {
      title: "유노바",
      description: DEFAULT_DESC,
      images: [{ url: "/unova_main.png", width: 1024, height: 1024, alt: "유노바" }],
      type: "website",
      siteName: "유노바",
    },
    twitter: {
      card: "summary_large_image",
      title: "유노바",
      description: DEFAULT_DESC,
      images: ["/unova_main.png"],
    },
    alternates: { canonical: `/store/${productId}` },
  };

  try {
    // 1) 강의 먼저 탐색 (slug 또는 id)
    const courseBaseWhere: Prisma.CourseWhereInput = {
      OR: [{ slug: productId }, { id: productId }],
      isPublished: true,
    };
    const courseWhere: Prisma.CourseWhereInput = storeOwnerEmail
      ? { ...courseBaseWhere, owner: { email: storeOwnerEmail } }
      : courseBaseWhere;

    let course = await prisma.course.findFirst({
      where: courseWhere,
      select: { id: true, title: true, description: true, teacherName: true, updatedAt: true },
    });
    if (storeOwnerEmail && !course) {
      course = await prisma.course.findFirst({
        where: courseBaseWhere,
        select: { id: true, title: true, description: true, teacherName: true, updatedAt: true },
      });
    }

    if (course) {
      const title = `${course.title} | 유노바`;
      const description =
        toSafeOgDescription(course.description) ||
        toSafeOgDescription(course.teacherName ? `${course.teacherName} 선생님 강의` : null) ||
        DEFAULT_DESC;
      const imageUrl = buildOgImageUrl(
        `/api/courses/${course.id}/thumbnail?v=${course.updatedAt.getTime()}`,
      );

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [{ url: imageUrl, width: 1200, height: 630, alt: course.title }],
          type: "website",
          siteName: "유노바",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imageUrl],
        },
        alternates: { canonical: `/store/${productId}` },
      };
    }

    // 2) 교재 탐색
    const textbookBaseWhere: Prisma.TextbookWhereInput = {
      OR: [{ id: productId }],
      isPublished: true,
    };
    const textbookWhere: Prisma.TextbookWhereInput = storeOwnerEmail
      ? { ...textbookBaseWhere, owner: { email: storeOwnerEmail } }
      : textbookBaseWhere;

    let textbook = await prisma.textbook.findFirst({
      where: textbookWhere,
      select: { id: true, title: true, description: true, teacherName: true, updatedAt: true },
    });
    if (storeOwnerEmail && !textbook) {
      textbook = await prisma.textbook.findFirst({
        where: textbookBaseWhere,
        select: { id: true, title: true, description: true, teacherName: true, updatedAt: true },
      });
    }

    if (textbook) {
      const title = `${textbook.title} | 유노바`;
      const description =
        toSafeOgDescription(textbook.description) ||
        toSafeOgDescription(textbook.teacherName ? `${textbook.teacherName} 선생님 교재` : null) ||
        DEFAULT_DESC;
      const imageUrl = buildOgImageUrl(
        `/api/textbooks/${textbook.id}/thumbnail?v=${textbook.updatedAt.getTime()}`,
      );

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: [{ url: imageUrl, width: 1200, height: 630, alt: textbook.title }],
          type: "website",
          siteName: "유노바",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imageUrl],
        },
        alternates: { canonical: `/store/${productId}` },
      };
    }

  } catch {
    // 메타데이터 생성 실패 시에도 페이지가 깨지지 않게 기본값 유지
    return base;
  }

  return base;
}

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  try {
    const { productId } = await params;
    const storeOwnerEmail = getStoreOwnerEmail();
    await ensureSoldOutColumnsOnce();

  // Render 등 배포 환경에서 DB 쿼리 실패 시에도 상세 페이지가 500으로 죽지 않도록 폴백 처리
  type DbCourse = Prisma.CourseGetPayload<{
    include: {
      lessons: {
        select: { id: true; title: true; durationSeconds: true; vimeoVideoId: true };
      };
    };
  }>;

  // Textbook은 운영/배포 환경에서 마이그레이션 누락(컬럼 없음) 시 쿼리가 실패할 수 있어
  // "full select"와 "minimal select"를 모두 허용하는 유니온 타입으로 다룹니다.
  type DbTextbookFull = Prisma.TextbookGetPayload<{
    select: {
      id: true;
      title: true;
      subjectName: true;
      teacherName: true;
      teacherImageUrl: true;
      teacherTitle: true;
      teacherDescription: true;
      thumbnailUrl: true;
      imwebProdCode: true;
      price: true;
      originalPrice: true;
      isSoldOut: true;
      rating: true;
      reviewCount: true;
      tags: true;
      benefits: true;
      features: true;
      description: true;
      extraOptions: true;
      entitlementDays: true;
      relatedTextbookIds: true;
      composition: true;
    };
  }>;

  type DbTextbookMinimal = Prisma.TextbookGetPayload<{
    select: {
      id: true;
      title: true;
      subjectName: true;
      teacherName: true;
      teacherImageUrl: true;
      teacherTitle: true;
      teacherDescription: true;
      thumbnailUrl: true;
      imwebProdCode: true;
      price: true;
      originalPrice: true;
      isSoldOut: true;
      rating: true;
      reviewCount: true;
      tags: true;
      benefits: true;
      features: true;
      description: true;
      entitlementDays: true;
    };
  }>;

  type DbTextbook = DbTextbookFull | DbTextbookMinimal;

  let dbCourse: DbCourse | null = null;
  let dbTextbook: DbTextbook | null = null;

  try {
    // 먼저 DB에서 강좌를 찾기 (slug 또는 id)
    const courseBaseWhere: Prisma.CourseWhereInput = {
      OR: [{ slug: productId }, { id: productId }],
      isPublished: true,
    };
    const courseWhere: Prisma.CourseWhereInput = storeOwnerEmail
      ? { ...courseBaseWhere, owner: { email: storeOwnerEmail } }
      : courseBaseWhere;

    dbCourse = await prisma.course.findFirst({
      where: courseWhere,
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          select: { id: true, title: true, durationSeconds: true, vimeoVideoId: true },
        },
      },
    });
    if (storeOwnerEmail && !dbCourse) {
      dbCourse = await prisma.course.findFirst({
        where: courseBaseWhere,
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: { id: true, title: true, durationSeconds: true, vimeoVideoId: true },
          },
        },
      });
    }

    // DB 교재 검색
    if (!dbCourse) {
      try {
        const textbookBaseWhere: Prisma.TextbookWhereInput = {
          OR: [{ id: productId }],
          isPublished: true,
        };
        const textbookWhere: Prisma.TextbookWhereInput = storeOwnerEmail
          ? { ...textbookBaseWhere, owner: { email: storeOwnerEmail } }
          : textbookBaseWhere;

        dbTextbook = await prisma.textbook.findFirst({
          where: textbookWhere,
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            teacherImageUrl: true,
            teacherTitle: true,
            teacherDescription: true,
            thumbnailUrl: true,
            imwebProdCode: true,
            price: true,
            originalPrice: true,
            isSoldOut: true,
            rating: true,
            reviewCount: true,
            tags: true,
            benefits: true,
            features: true,
            description: true,
            extraOptions: true,
            entitlementDays: true,
            relatedTextbookIds: true,
            composition: true,
          },
        });
        if (storeOwnerEmail && !dbTextbook) {
          dbTextbook = await prisma.textbook.findFirst({
            where: textbookBaseWhere,
            select: {
              id: true,
              title: true,
              subjectName: true,
              teacherName: true,
              teacherImageUrl: true,
              teacherTitle: true,
              teacherDescription: true,
              thumbnailUrl: true,
              imwebProdCode: true,
              price: true,
              originalPrice: true,
              isSoldOut: true,
              rating: true,
              reviewCount: true,
              tags: true,
              benefits: true,
              features: true,
              description: true,
              extraOptions: true,
              entitlementDays: true,
              relatedTextbookIds: true,
              composition: true,
            },
          });
        }
      } catch (e) {
        // 운영/로컬 환경에서 마이그레이션 누락 등으로 일부 컬럼이 없을 수 있음 → 최소 select로 폴백
        // NOTE: Next dev(Turbopack)에서 server console.error가 소스맵 오버레이 이슈를 유발하는 경우가 있어
        // 여기서는 에러 객체를 그대로 찍지 않고 warn으로 낮춰 노이즈/오버레이를 줄입니다.
        console.warn("[store/product] textbook query failed with full select. Falling back to minimal select.");
        // 최소 select에서도 teacherImageUrl은 가져오되, (운영 환경 등) 컬럼이 없는 경우에는 한 번 더 폴백합니다.
        try {
          const textbookBaseWhere: Prisma.TextbookWhereInput = {
            OR: [{ id: productId }],
            isPublished: true,
          };
          const textbookWhere: Prisma.TextbookWhereInput = storeOwnerEmail
            ? { ...textbookBaseWhere, owner: { email: storeOwnerEmail } }
            : textbookBaseWhere;

          dbTextbook = await prisma.textbook.findFirst({
            where: textbookWhere,
            select: {
              id: true,
              title: true,
              subjectName: true,
              teacherName: true,
              teacherImageUrl: true,
              teacherTitle: true,
              teacherDescription: true,
              thumbnailUrl: true,
              imwebProdCode: true,
              price: true,
              originalPrice: true,
              isSoldOut: true,
              rating: true,
              reviewCount: true,
              tags: true,
              benefits: true,
              features: true,
              description: true,
              entitlementDays: true,
            },
          });
          if (storeOwnerEmail && !dbTextbook) {
            dbTextbook = await prisma.textbook.findFirst({
              where: textbookBaseWhere,
              select: {
                id: true,
                title: true,
                subjectName: true,
                teacherName: true,
                teacherImageUrl: true,
                teacherTitle: true,
                teacherDescription: true,
                thumbnailUrl: true,
                imwebProdCode: true,
                price: true,
                originalPrice: true,
                isSoldOut: true,
                rating: true,
                reviewCount: true,
                tags: true,
                benefits: true,
                features: true,
                description: true,
                entitlementDays: true,
              },
            });
          }
        } catch {
          // teacherImageUrl 컬럼이 없는 환경(레거시/마이그레이션 누락)에서는
          // select에서 teacherImageUrl을 뺀 뒤, 결과에 null을 보정해서 타입을 맞춥니다.
          const textbookBaseWhere: Prisma.TextbookWhereInput = {
            OR: [{ id: productId }],
            isPublished: true,
          };
          const textbookWhere: Prisma.TextbookWhereInput = storeOwnerEmail
            ? { ...textbookBaseWhere, owner: { email: storeOwnerEmail } }
            : textbookBaseWhere;

          let minimal = await prisma.textbook.findFirst({
            where: textbookWhere,
            select: {
              id: true,
              title: true,
              subjectName: true,
              teacherName: true,
              teacherTitle: true,
              teacherDescription: true,
              thumbnailUrl: true,
              imwebProdCode: true,
              price: true,
              originalPrice: true,
              isSoldOut: true,
              rating: true,
              reviewCount: true,
              tags: true,
              benefits: true,
              features: true,
              description: true,
              entitlementDays: true,
            },
          });
          if (storeOwnerEmail && !minimal) {
            minimal = await prisma.textbook.findFirst({
              where: textbookBaseWhere,
              select: {
                id: true,
                title: true,
                subjectName: true,
                teacherName: true,
                teacherTitle: true,
                teacherDescription: true,
                thumbnailUrl: true,
                imwebProdCode: true,
                price: true,
                originalPrice: true,
                isSoldOut: true,
                rating: true,
                reviewCount: true,
                tags: true,
                benefits: true,
                features: true,
                description: true,
                entitlementDays: true,
              },
            });
          }
          dbTextbook = minimal ? ({ ...minimal, teacherImageUrl: null } as any) : null;
        }
      }
    } else {
      dbTextbook = null;
    }
  } catch (e) {
    console.error("[store/product] failed to load product from DB:", { productId, e });
    dbCourse = null;
    dbTextbook = null;
  }

  // 관련 교재 목록 가져오기 (relatedTextbookIds에 지정된 교재만)
  let relatedTextbooks: Array<{
    id: string;
    title: string;
    price: number | null;
    originalPrice: number | null;
    thumbnailUrl: string | null;
    teacherName: string | null;
    subjectName: string | null;
    rating: number | null;
    reviewCount: number | null;
  }> = [];
  
  // 교재의 relatedTextbookIds 가져오기
  const relatedTextbookIds = dbTextbook 
    ? ((dbTextbook as { relatedTextbookIds?: string[] | null }).relatedTextbookIds ?? [])
    : [];
  
  if (relatedTextbookIds.length > 0) {
    try {
      // NOTE: "교재 관리하기" 페이지의 교재 목록 정렬과 동일하게 맞춤
      // - 1차: position desc -> createdAt desc
      // - 폴백: (운영 환경에서 position 컬럼 누락 등) createdAt desc
      try {
        relatedTextbooks = await prisma.textbook.findMany({
          where: {
            isPublished: true,
            id: { in: relatedTextbookIds },
          },
          orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            thumbnailUrl: true,
            teacherName: true,
            subjectName: true,
            rating: true,
            reviewCount: true,
          },
        });
      } catch (e) {
        console.error("[store/product] related textbooks query failed with position order, fallback to createdAt:", e);
        relatedTextbooks = await prisma.textbook.findMany({
          where: {
            isPublished: true,
            id: { in: relatedTextbookIds },
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            thumbnailUrl: true,
            teacherName: true,
            subjectName: true,
            rating: true,
            reviewCount: true,
          },
        });
      }
    } catch (e) {
      console.error("[store/product] failed to load related textbooks:", e);
      relatedTextbooks = [];
    }
  }

  // DB에서 데이터를 찾은 경우
  if (dbCourse) {
    const rawPrice = dbCourse.price;
    const isPriceSet = rawPrice !== null && rawPrice !== undefined;
    const price = rawPrice ?? 0;
    const originalPrice = dbCourse.originalPrice || null;
    const dailyPrice = dbCourse.dailyPrice || Math.round(price / 30);
    const discount = originalPrice ? getDiscount(originalPrice, price) : null;

    const normalizeImageUrl = (u: string | null | undefined): string | null => {
      const v = (u ?? "").trim();
      if (!v) return null;
      if (v.toLowerCase().startsWith("gs://")) return `https://storage.googleapis.com/${v.slice(5)}`;
      return v;
    };

    // 강좌의 teacherName이 Teachers 테이블(어드민 선생님 관리)에 존재하면,
    // 선생님 페이지 링크/프로필 이미지(썸네일)를 자동으로 매칭합니다.
    const teacherName = dbCourse.teacherName || "선생님";
    let teacherId = "unova";
    let teacherImageUrl: string | null = null;
    const teacherNameKey = teacherName.replace(/선생님/g, "").trim();
    if (teacherNameKey && teacherNameKey !== "선생님") {
      try {
        const t = await prisma.teacher.findFirst({
          where: {
            isActive: true,
            OR: [
              { name: { equals: teacherNameKey, mode: "insensitive" } },
              { name: { contains: teacherNameKey, mode: "insensitive" } },
            ],
          },
          select: { slug: true, imageUrl: true, mainImageUrl: true },
        });
        teacherId = t?.slug || teacherId;
        teacherImageUrl = normalizeImageUrl(t?.imageUrl || t?.mainImageUrl);
      } catch {
        // ignore
      }
    }

    // 강의 상세에서 "교재 함께 구매" 옵션으로 보여줄 교재
    // - 강좌 관리(addons)에서 선택한 relatedTextbookIds가 있으면 그것만 노출
    // - 선택이 없으면(미설정) 스토어에서는 노출하지 않음(빈 배열)
    let bundleTextbooks: Array<{
      id: string;
      title: string;
      price: number | null;
      originalPrice: number | null;
      thumbnailUrl: string | null;
      teacherName: string | null;
      subjectName: string | null;
      rating: number | null;
      reviewCount: number | null;
    }> = [];
    // 강의 상세에서 "추가 상품"으로 보여줄 강좌(관리자 선택)
    let addonCourses: Array<{
      id: string;
      title: string;
      price: number | null;
      originalPrice: number | null;
      thumbnailUrl: string | null;
      teacherName: string | null;
      subjectName: string | null;
      rating: number | null;
      reviewCount: number | null;
    }> = [];
    try {
      let selectedTextbookIds: string[] | null = null;
      let selectedCourseIds: string[] | null = null;
      try {
        await ensureCourseAddonsColumnsOnce();
        const rows = (await prisma.$queryRawUnsafe(
          'SELECT "relatedTextbookIds", "relatedCourseIds" FROM "Course" WHERE "id" = $1',
          dbCourse.id
        )) as any[];
        const rawTb = rows?.[0]?.relatedTextbookIds;
        const rawCs = rows?.[0]?.relatedCourseIds;
        selectedTextbookIds = Array.isArray(rawTb) ? rawTb : null;
        selectedCourseIds = Array.isArray(rawCs) ? rawCs : null;
      } catch (e) {
        console.error("[store/product] failed to read course addons via raw:", e);
        selectedTextbookIds = null;
        selectedCourseIds = null;
      }

      // 추가 교재(교재 함께 구매): 관리자가 선택한 경우에만 노출 (선택이 없으면 빈 배열)
      if (selectedTextbookIds !== null) {
        bundleTextbooks = selectedTextbookIds.length
          ? await prisma.textbook.findMany({
              where: (storeOwnerEmail
                ? {
                    isPublished: true,
                    owner: { email: storeOwnerEmail },
                    id: { in: selectedTextbookIds },
                  }
                : { isPublished: true, id: { in: selectedTextbookIds } }) satisfies Prisma.TextbookWhereInput,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                price: true,
                originalPrice: true,
                thumbnailUrl: true,
                teacherName: true,
                subjectName: true,
                rating: true,
                reviewCount: true,
              },
            })
          : [];
      } else {
        bundleTextbooks = [];
      }

      // 추가 상품(강의): 관리자가 선택한 경우에만 노출 (선택이 없으면 빈 배열)
      if (selectedCourseIds !== null) {
        addonCourses = selectedCourseIds.length
          ? await prisma.course.findMany({
              where: (storeOwnerEmail
                ? {
                    isPublished: true,
                    owner: { email: storeOwnerEmail },
                    id: { in: selectedCourseIds },
                  }
                : { isPublished: true, id: { in: selectedCourseIds } }) satisfies Prisma.CourseWhereInput,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                price: true,
                originalPrice: true,
                thumbnailUrl: true,
                teacherName: true,
                subjectName: true,
                rating: true,
                reviewCount: true,
              },
            })
          : [];
      } else {
        addonCourses = [];
      }
    } catch (e) {
      console.error("[store/product] failed to load bundle textbooks:", e);
      bundleTextbooks = [];
      addonCourses = [];
    }

    // lessons를 curriculum 형태로 변환
    const curriculum = [{
      chapter: "전체 강의",
      duration: formatDuration(dbCourse.lessons.reduce((acc, l) => acc + (l.durationSeconds || 0), 0)),
      lessons: dbCourse.lessons.map((l) => ({
        title: l.title,
        duration: formatDuration(l.durationSeconds || 0),
        vimeoId: l.vimeoVideoId,
      })),
    }];

    return (
      <div className="min-h-screen bg-[#161616] text-white">
        <LandingHeader />

        <main className="pt-[var(--unova-fixed-header-offset)]">
          <div className="mx-auto max-w-6xl px-4">
            <ProductDetailClient
              product={{
                id: dbCourse.id,
                title: dbCourse.title,
                subject: dbCourse.subjectName || "강좌",
                subjectColor: "text-blue-400",
                subjectBg: "bg-blue-500/20",
                teacher: teacherName,
                teacherId,
                teacherTitle: dbCourse.teacherTitle || "",
                teacherDescription: dbCourse.teacherDescription || "",
                teacherImageUrl,
                // course 썸네일은 /api/courses/:id/thumbnail 로 통일해서 보여줍니다.
                // storedPath 기반 썸네일(레거시)도 UI에서 "있음"으로 인식하도록 값 보정.
                thumbnailUrl: dbCourse.thumbnailUrl || ((dbCourse as any).thumbnailStoredPath ? "__stored__" : null),
                isSoldOut: Boolean((dbCourse as any).isSoldOut),
                isPriceSet,
                price,
                originalPrice,
                dailyPrice,
                type: "course",
                description: dbCourse.description || "",
                rating: dbCourse.rating ?? 0,
                reviewCount: dbCourse.reviewCount || 0,
                tags: (dbCourse.tags as string[] | null) || [],
                studyPeriod: { regular: 30, review: dbCourse.enrollmentDays - 30 },
                benefits: (dbCourse.benefits as string[] | null) || [],
                features: (dbCourse.features as string[] | null) || [],
                extraOptions: [],
                curriculum,
                reviews: [],
                discount,
                formattedPrice: formatPrice(price),
                formattedOriginalPrice: originalPrice ? formatPrice(originalPrice) : null,
                formattedDailyPrice: formatPrice(dailyPrice),
                previewVimeoId: dbCourse.previewVimeoId,
              }}
              relatedProducts={bundleTextbooks.map((t) => ({
                id: t.id,
                title: t.title,
                isPriceSet: t.price !== null && t.price !== undefined,
                price: t.price ?? 0,
                originalPrice: t.originalPrice,
                thumbnailUrl: t.thumbnailUrl,
                teacher: t.teacherName || "선생님",
                subject: t.subjectName || "교재",
                rating: t.rating ?? 0,
                reviewCount: t.reviewCount ?? 0,
              }))}
              addonCourses={addonCourses.map((c) => ({
                id: c.id,
                title: c.title,
                isPriceSet: c.price !== null && c.price !== undefined,
                price: c.price ?? 0,
                originalPrice: c.originalPrice,
                thumbnailUrl: c.thumbnailUrl,
                teacher: c.teacherName || "선생님",
                subject: c.subjectName || "강좌",
                rating: c.rating ?? 0,
                reviewCount: c.reviewCount ?? 0,
              }))}
            />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (dbTextbook) {
    const rawPrice = dbTextbook.price;
    const isPriceSet = rawPrice !== null && rawPrice !== undefined;
    const price = rawPrice ?? 0;
    const originalPrice = dbTextbook.originalPrice || null;
    const dailyPrice = Math.round(price / 30);
    const discount = originalPrice ? getDiscount(originalPrice, price) : null;
    const teacherName = (dbTextbook as { teacherName?: string | null }).teacherName || "선생님";
    const teacherTitle = (dbTextbook as { teacherTitle?: string | null }).teacherTitle || "";
    const teacherDescription = (dbTextbook as { teacherDescription?: string | null }).teacherDescription || "";
    const normalizeImageUrl = (u: string | null | undefined): string | null => {
      const v = (u ?? "").trim();
      if (!v) return null;
      if (v.toLowerCase().startsWith("gs://")) return `https://storage.googleapis.com/${v.slice(5)}`;
      return v;
    };

    // 교재의 teacherImageUrl이 없으면, Teachers 테이블(유노바 선생님)에서 이름으로 매칭해 폴백합니다.
    let teacherImageUrl = normalizeImageUrl((dbTextbook as { teacherImageUrl?: string | null }).teacherImageUrl);
    let teacherId = "unova";
    const teacherNameKey = teacherName.replace(/선생님/g, "").trim();
    if (teacherNameKey && teacherNameKey !== "선생님") {
      try {
        const t = await prisma.teacher.findFirst({
          where: {
            isActive: true,
            OR: [
              { name: { equals: teacherNameKey, mode: "insensitive" } },
              { name: { contains: teacherNameKey, mode: "insensitive" } },
            ],
          },
          select: { slug: true, imageUrl: true, mainImageUrl: true },
        });
        teacherId = t?.slug || teacherId;
        if (!teacherImageUrl) teacherImageUrl = normalizeImageUrl(t?.imageUrl || t?.mainImageUrl);
      } catch {
        // ignore
      }
    }
    const thumbnailUrl = (dbTextbook as { thumbnailUrl?: string | null }).thumbnailUrl || null;
    const composition = (dbTextbook as { composition?: string | null }).composition ?? null;
    const isbn = (dbTextbook as { imwebProdCode?: string | null }).imwebProdCode ?? null;

    return (
      <div className="min-h-screen bg-[#161616] text-white">
        <LandingHeader />

        <main className="pt-[var(--unova-fixed-header-offset)]">
          <div className="mx-auto max-w-6xl px-4">
            <ProductDetailClient
              product={{
                id: dbTextbook.id,
                title: dbTextbook.title,
                subject: dbTextbook.subjectName || "교재",
                subjectColor: "text-amber-400",
                subjectBg: "bg-amber-500/20",
                teacher: teacherName,
                teacherId,
                teacherTitle,
                teacherDescription,
                teacherImageUrl,
                thumbnailUrl,
                isbn,
                isSoldOut: Boolean((dbTextbook as any).isSoldOut),
                isPriceSet,
                price,
                originalPrice,
                dailyPrice,
                type: "textbook",
                description: dbTextbook.description || "",
                composition,
                rating: dbTextbook.rating ?? 0,
                reviewCount: dbTextbook.reviewCount || 0,
                tags: (dbTextbook.tags as string[] | null) || [],
                // 교재는 다운로드/이용 기간만 존재 (복습 개념 없음)
                studyPeriod: { regular: dbTextbook.entitlementDays ?? 30, review: 0 },
                benefits: (dbTextbook.benefits as string[] | null) || [],
                features: (dbTextbook.features as string[] | null) || [],
                extraOptions:
                  ((dbTextbook as { extraOptions?: { name: string; value: string }[] | null }).extraOptions as
                    | { name: string; value: string }[]
                    | null) || [],
                curriculum: [],
                reviews: [],
                discount,
                formattedPrice: formatPrice(price),
                formattedOriginalPrice: originalPrice ? formatPrice(originalPrice) : null,
                formattedDailyPrice: formatPrice(dailyPrice),
              }}
              relatedProducts={relatedTextbooks.map((t) => ({
                id: t.id,
                title: t.title,
                isPriceSet: t.price !== null && t.price !== undefined,
                price: t.price ?? 0,
                originalPrice: t.originalPrice,
                thumbnailUrl: t.thumbnailUrl,
                teacher: t.teacherName || "선생님",
                subject: t.subjectName || "교재",
                rating: t.rating ?? 0,
                reviewCount: t.reviewCount ?? 0,
              }))}
            />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  notFound();
  } catch (e) {
    console.error("[store/product] page render failed:", e);
    return (
      <div className="min-h-screen bg-[#161616] text-white">
        <LandingHeader />
        <main className="pt-[var(--unova-fixed-header-offset)]">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h1 className="text-xl font-semibold text-white">상품 상세</h1>
              <p className="mt-2 text-sm text-white/70">
                상품 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/store" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
                  목록으로
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
