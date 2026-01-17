import Link from "next/link";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import StoreFilterClient from "@/app/store/StoreFilterClient";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";

// 스토어는 공개 상품 목록(모든 사용자 동일)이므로 짧은 ISR 캐시로 체감 로딩을 줄입니다.
export const revalidate = 60;

function getStoreOwnerEmail(): string {
  // NOTE: 스토어는 "판매 등록된 상품"을 보여줘야 하므로,
  // 특정 owner(ADMIN_EMAIL)로 제한하지 않습니다.
  return "";
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
  isSoldOut: boolean;
  // course 레거시(파일 저장) 썸네일 지원용: thumbnailUrl이 비어있어도 storedPath가 있으면 API로 서빙 가능
  thumbnailStoredPath?: string | null;
  thumbnailUpdatedAtISO?: string | null;
  rating: number | null;
  reviewCount: number | null;
};

// URL 파라미터/레거시 표기를 모두 수용: 강의/강좌 -> course
const TYPE_MAP: Record<string, "course" | "textbook"> = {
  강의: "course",
  강좌: "course",
  교재: "textbook",
};

const getCachedCoursesForStore = unstable_cache(
  async () => {
    // "강좌 판매하기"에서 판매 설정된 강좌만 노출:
    // - 공개(isPublished)
    // - 판매가/정가 중 하나라도 설정된 항목만
    const where: Prisma.CourseWhereInput = {
      isPublished: true,
      OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
    };

    const rows = await prisma.course.findMany({
      where,
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
        isSoldOut: true,
        rating: true,
        reviewCount: true,
      },
      // "내 강좌 목록"과 동일 정렬: position asc → updatedAt desc → createdAt desc
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      // 안전 가드: 너무 많은 상품을 캐시에 넣으면(2MB 제한) unstable_cache 저장이 실패할 수 있습니다.
      take: 200,
    });
    // NOTE:
    // thumbnailUrl이 data URL(베이스64)인 경우 한 리스트에서 수 MB가 될 수 있어
    // unstable_cache(2MB 제한) 저장이 실패합니다.
    // 캐시에는 큰 문자열(thumbnailUrl) 자체를 넣지 않고, 존재 여부만 남깁니다.
    return rows.map((r) => {
      const { thumbnailUrl, updatedAt, ...rest } = r;
      // Date는 캐시 직렬화 시 string으로 바뀔 수 있어, 미리 ISO로 고정해둡니다.
      return { ...rest, updatedAtISO: updatedAt.toISOString(), hasThumbnail: Boolean(thumbnailUrl) };
    });
  },
  ["store:courses:v4"],
  { revalidate: 60 }
);

const getCachedTextbooksForStore = unstable_cache(
  async () => {
    // NOTE: 교재는 "교재 관리하기" 페이지 정렬과 동일하게 맞춤
    // - 1차: position desc -> createdAt desc
    // - 폴백: (운영 환경에서 position 컬럼 누락 등) createdAt desc
    try {
      const baseWhere: Prisma.TextbookWhereInput = {
        isPublished: true,
        // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만 노출
        OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
      };
      const where = baseWhere;

      let rows = await prisma.textbook.findMany({
        where,
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
          isSoldOut: true,
          rating: true,
          reviewCount: true,
        },
        orderBy: [{ position: "desc" }, { createdAt: "desc" }],
        take: 200,
      });
      // 캐시에 thumbnailUrl(특히 data URL)을 넣지 않도록 존재 여부만 남김
      return rows.map((r) => {
        const { thumbnailUrl, updatedAt, ...rest } = r;
        return { ...rest, updatedAtISO: updatedAt.toISOString(), hasThumbnail: Boolean(thumbnailUrl) };
      });
    } catch (e) {
      console.error("[store] textbooks query failed with position order, fallback to createdAt:", e);
      const baseWhere: Prisma.TextbookWhereInput = {
        isPublished: true,
        // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만 노출
        OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
      };
      const where = baseWhere;

      let rows = await prisma.textbook.findMany({
        where,
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
          isSoldOut: true,
          rating: true,
          reviewCount: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 200,
      });
      return rows.map((r) => {
        const { thumbnailUrl, updatedAt, ...rest } = r;
        return { ...rest, updatedAtISO: updatedAt.toISOString(), hasThumbnail: Boolean(thumbnailUrl) };
      });
    }
  },
  ["store:textbooks:v4"],
  { revalidate: 60 }
);

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
  await ensureSoldOutColumnsOnce();

  const currentType = TYPE_MAP[selectedType] ?? "textbook";

  // 실제 DB에서 공개된 상품 조회(선택 타입만) + 캐시
  // - 메뉴 전환 시 체감 로딩 최소화
  // - 캐시 미스(처음 방문)에서도 불필요한 조회를 줄여 초기 로딩 개선
  let productsOfCurrentType: Product[] = [];
  try {
    if (currentType === "course") {
      const courses = await getCachedCoursesForStore();
      productsOfCurrentType = courses.map((c) => {
        const tags = ((c as any).tags as string[] | null) || [];
        return {
          id: c.id,
          title: c.title,
          subject: (c as any).subjectName || "미분류",
          teacher: (c as any).teacherName || "선생님",
          price: (c as any).price || 0,
          originalPrice: (c as any).originalPrice,
          tag: tags[0] || null,
          tags,
          textbookType: null,
          type: "course" as const,
          // StoreFilterClient는 썸네일을 항상 /api/.../thumbnail로 가져오므로
          // 여기서는 "썸네일이 있는지"만 나타내는 작은 값만 유지합니다.
          thumbnailUrl: (c as any).hasThumbnail ? "__thumb__" : null,
          isSoldOut: Boolean((c as any).isSoldOut),
          thumbnailStoredPath: (c as any).thumbnailStoredPath,
          thumbnailUpdatedAtISO: (c as any).updatedAtISO,
          rating: (c as any).rating,
          reviewCount: (c as any).reviewCount,
        };
      });
    } else {
      const textbooks = await getCachedTextbooksForStore();
      productsOfCurrentType = textbooks.map((t) => {
        const tags = ((t as any).tags as string[] | null) || [];
        return {
          id: t.id,
          title: t.title,
          subject: (t as any).subjectName || "교재",
          teacher: (t as any).teacherName || "선생님",
          price: (t as any).price || 0,
          originalPrice: (t as any).originalPrice,
          tag: tags[0] || null,
          tags,
          textbookType: (t as any).textbookType ?? null,
          type: "textbook" as const,
          thumbnailUrl: (t as any).hasThumbnail ? "__thumb__" : null,
          isSoldOut: Boolean((t as any).isSoldOut),
          thumbnailUpdatedAtISO: (t as any).updatedAtISO,
          rating: (t as any).rating,
          reviewCount: (t as any).reviewCount,
        };
      });
    }
  } catch (e) {
    console.error("[store] failed to load products from DB:", e);
    productsOfCurrentType = [];
  }

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

