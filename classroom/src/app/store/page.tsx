import Link from "next/link";
import { Suspense } from "react";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import StoreFilterClient from "@/app/store/StoreFilterClient";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function getStoreOwnerEmail(): string {
  // 이 프로젝트는 기본적으로 "고정 관리자(ADMIN_EMAIL)" 계정이 콘텐츠를 발행합니다.
  // 배포 환경에서 예전/다른 ownerId로 생성된 공개 강좌/교재가 남아있을 수 있어
  // 스토어는 기본적으로 관리자 이메일 소유 상품만 노출합니다.
  return (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
}

type Product = {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  price: number;
  originalPrice: number | null;
  tag: string | null;
  tags: string[];
  textbookType: string | null;
  type: "course" | "textbook";
  thumbnailUrl: string | null;
  // course 레거시(파일 저장) 썸네일 지원용: thumbnailUrl이 비어있어도 storedPath가 있으면 API로 서빙 가능
  thumbnailStoredPath?: string | null;
  thumbnailUpdatedAtISO?: string | null;
  rating: number | null;
  reviewCount: number | null;
};

function StoreProductsSkeleton({ label }: { label: "교재" | "강의" }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 왼쪽 사이드바 스켈레톤 */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-[90px] space-y-6 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-16 rounded bg-white/10" />
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: i === 0 ? 1 : 4 }).map((__, j) => (
                    <div
                      key={j}
                      className="h-8 w-20 rounded-md bg-white/[0.08] animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* 오른쪽 상품 목록 스켈레톤 */}
        <main className="flex-1 min-w-0">
          <div className="mb-5">
            <p className="text-[14px] text-white/50">
              총 <span className="inline-block h-4 w-10 rounded bg-white/10 align-[-2px] animate-pulse" />개의 {label}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9 sm:gap-x-6 sm:gap-y-12">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="group">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-white/[0.06] animate-pulse" />
                <div className="mt-3 px-0.5 space-y-2">
                  <div className="h-4 w-5/6 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

async function StoreProducts({
  selectedType,
  selectedSubject,
  selectedExamType,
}: {
  selectedType: string;
  selectedSubject: string;
  selectedExamType: string;
}) {
  const storeOwnerEmail = getStoreOwnerEmail();

  // 실제 DB에서 공개된 강좌/교재 조회
  // Render 등 배포 환경에서 DB 연결/쿼리 이슈가 발생해도 페이지 전체가 500으로 죽지 않도록 안전 폴백 처리
  type DbCourseRow = Prisma.CourseGetPayload<{
    select: {
      id: true;
      title: true;
      subjectName: true;
      teacherName: true;
      price: true;
      originalPrice: true;
      tags: true;
      thumbnailUrl: true;
      thumbnailStoredPath: true;
      updatedAt: true;
      rating: true;
      reviewCount: true;
    };
  }>;

  type DbTextbookRow = Prisma.TextbookGetPayload<{
    select: {
      id: true;
      title: true;
      subjectName: true;
      teacherName: true;
      price: true;
      originalPrice: true;
      tags: true;
      textbookType: true;
      thumbnailUrl: true;
      updatedAt: true;
      rating: true;
      reviewCount: true;
    };
  }>;

  let courses: DbCourseRow[] = [];
  let textbooks: DbTextbookRow[] = [];
  try {
    // NOTE: 교재는 "교재 관리하기" 페이지 정렬과 동일하게 맞춤
    // - 1차: position desc -> createdAt desc
    // - 폴백: (운영 환경에서 position 컬럼 누락 등) createdAt desc
    [courses, textbooks] = await Promise.all([
      prisma.course.findMany({
        where: { isPublished: true, owner: { email: storeOwnerEmail } },
        select: {
          id: true,
          title: true,
          subjectName: true,
          teacherName: true,
          price: true,
          originalPrice: true,
          tags: true,
          thumbnailUrl: true,
          thumbnailStoredPath: true,
          updatedAt: true,
          rating: true,
          reviewCount: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      (async () => {
        try {
          return await prisma.textbook.findMany({
            where: {
              isPublished: true,
              owner: { email: storeOwnerEmail },
              // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만 노출
              OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
            },
            select: {
              id: true,
              title: true,
              subjectName: true,
              teacherName: true,
              price: true,
              originalPrice: true,
              tags: true,
              textbookType: true,
              thumbnailUrl: true,
              updatedAt: true,
              rating: true,
              reviewCount: true,
            },
            orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          });
        } catch (e) {
          console.error("[store] textbooks query failed with position order, fallback to createdAt:", e);
          return await prisma.textbook.findMany({
            where: {
              isPublished: true,
              owner: { email: storeOwnerEmail },
              // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만 노출
              OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
            },
            select: {
              id: true,
              title: true,
              subjectName: true,
              teacherName: true,
              price: true,
              originalPrice: true,
              tags: true,
              textbookType: true,
              thumbnailUrl: true,
              updatedAt: true,
              rating: true,
              reviewCount: true,
            },
            orderBy: [{ createdAt: "desc" }],
          });
        }
      })(),
    ]);
  } catch (e) {
    console.error("[store] failed to load products from DB:", e);
    courses = [];
    textbooks = [];
  }

  // 강좌를 Product 형태로 변환
  const courseProducts: Product[] = courses.map((c) => {
    const tags = (c.tags as string[] | null) || [];
    return {
      id: c.id,
      title: c.title,
      subject: c.subjectName || "미분류",
      teacher: c.teacherName || "선생님",
      price: c.price || 0,
      originalPrice: c.originalPrice,
      tag: tags[0] || null, // 첫 번째 태그를 배지로 표시
      tags,
      textbookType: null,
      type: "course" as const,
      thumbnailUrl: c.thumbnailUrl,
      thumbnailStoredPath: c.thumbnailStoredPath,
      thumbnailUpdatedAtISO: c.updatedAt.toISOString(),
      rating: c.rating,
      reviewCount: c.reviewCount,
    };
  });

  // 교재를 Product 형태로 변환
  const textbookProducts: Product[] = textbooks.map((t) => {
    const tags = (t.tags as string[] | null) || [];
    return {
      id: t.id,
      title: t.title,
      subject: t.subjectName || "교재",
      teacher: t.teacherName || "선생님",
      price: t.price || 0,
      originalPrice: t.originalPrice,
      tag: tags[0] || null,
      tags,
      textbookType: (t as { textbookType?: string | null }).textbookType ?? null,
      type: "textbook" as const,
      thumbnailUrl: t.thumbnailUrl,
      thumbnailUpdatedAtISO: t.updatedAt.toISOString(),
      rating: t.rating,
      reviewCount: t.reviewCount,
    };
  });

  const products: Product[] = [...courseProducts, ...textbookProducts];

  // 유형 맵
  // URL 파라미터/레거시 표기를 모두 수용: 강의/강좌 -> course
  const typeMap: Record<string, "course" | "textbook"> = {
    강의: "course",
    강좌: "course",
    교재: "textbook",
  };
  const currentType = typeMap[selectedType] ?? "textbook";

  // 현재 선택된 유형에 해당하는 상품들만 필터
  const productsOfCurrentType = products.filter((p) => p.type === currentType);

  return (
    <StoreFilterClient
      products={productsOfCurrentType}
      selectedType={selectedType}
      initialSubject={selectedSubject}
      initialExamType={selectedExamType}
    />
  );
}

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string; type?: string; exam?: string }>;
}) {
  try {
    const sp = await searchParams;
    const selectedSubject = sp?.subject || "전체";
    const selectedExamType = sp?.exam || "전체";
    const rawType = sp?.type || "교재";
    // 표기 통일: 레거시 "강좌" -> "강의"
    const selectedType = rawType === "강좌" ? "강의" : rawType;
    const skeletonLabel: "교재" | "강의" = selectedType === "강의" ? "강의" : "교재";
    const pageCopy =
      selectedType === "강의"
        ? {
            title: "강의 구매하기",
            subtitle: "지금 바로 강의를 듣고 성적을 올려보세요",
          }
        : {
            title: "교재 구매하기",
            subtitle: "지금 바로 교재를 구매하고 성적을 올려보세요",
          };

    return (
      <div className="min-h-screen bg-[#161616] text-white flex flex-col">
        <LandingHeader />

        <main className="flex-1 pt-[70px]">
          {/* 페이지 타이틀(필터 버튼 위) */}
          <section className="mx-auto max-w-6xl px-4 pt-10 pb-6 text-left md:text-center">
            <h1 className="text-[22px] md:text-[40px] font-bold tracking-[-0.02em]">
              {pageCopy.title}
            </h1>
            <p className="mt-2 text-[13px] md:mt-3 md:text-[16px] text-white/55 md:text-white/50">
              {pageCopy.subtitle}
            </p>
          </section>

          {/* DB 조회는 느릴 수 있으므로, 먼저 스켈레톤을 보여주고 결과를 스트리밍합니다. */}
          <Suspense fallback={<StoreProductsSkeleton label={skeletonLabel} />}>
            <StoreProducts
              selectedType={selectedType}
              selectedSubject={selectedSubject}
              selectedExamType={selectedExamType}
            />
          </Suspense>

      </main>

        <Footer />
      </div>
    );
  } catch (e) {
    console.error("[store] page render failed:", e);
    return (
      <div className="min-h-screen bg-[#161616] text-white flex flex-col">
        <LandingHeader />
        <main className="flex-1 pt-[70px]">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h1 className="text-xl font-semibold text-white">교재 및 강의 구매</h1>
              <p className="mt-2 text-sm text-white/70">
                상품 목록을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/store"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
                >
                  다시 시도
                </Link>
                <Link
                  href="/teachers"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
                >
                  선생님 페이지로
                </Link>
              </div>
              <p className="mt-4 text-xs text-white/40">
                문제가 계속되면 관리자에게 문의해주세요.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

