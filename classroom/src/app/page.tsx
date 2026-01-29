import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import HomeLandingHeaderClient from "./_components/HomeLandingHeaderClient";
import HeroCarousel, { type HeroCarouselSlide } from "./_components/HeroCarousel";
import ShortcutNav, { type ShortcutNavItem } from "./_components/ShortcutNav";
import FloatingKakaoButton from "./_components/FloatingKakaoButton";
import PopupLayerClient from "./_components/PopupLayerClient";
import StorePreviewTabs, { type StorePreviewProduct } from "./_components/StorePreviewTabs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// 홈은 유저별 데이터가 아니고(쿠키/세션 의존 X) 변경도 잦지 않으므로
// ISR 캐시로 서버/DB 부하를 줄여 페이지 이동 체감 속도를 개선합니다.
export const revalidate = 60;

function getStoreOwnerEmail(): string {
  // NOTE: 홈 프리뷰는 "판매 등록된 상품"을 보여줘야 하므로 특정 owner로 제한하지 않습니다.
  return "";
}

export default async function HomePage() {
  getStoreOwnerEmail();

  // 메인 슬라이드/바로가기 아이콘: DB 없으면 기존 하드코딩 fallback 사용
  let heroSlides: HeroCarouselSlide[] | undefined = undefined;
  let shortcutItems: ShortcutNavItem[] | undefined = undefined;
  try {
    const p = prisma as unknown as any;
    const slidePromise =
      p?.homeSlide?.findMany
        ? p.homeSlide.findMany({
            where: { isActive: true },
            orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          })
        : Promise.resolve([]);
    const shortcutPromise =
      p?.homeShortcut?.findMany
        ? p.homeShortcut.findMany({
            where: { isActive: true },
            orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          })
        : Promise.resolve([]);

    // NOTE: DB 연결이 불안정한 환경(배포/빌드/콜드스타트 등)에서
    // `Promise.all()`은 하나만 실패해도 throw 되며, Next dev overlay가 "Console Error"로 크게 띄울 수 있습니다.
    // 홈은 설정을 못 불러와도 동작해야 하므로 allSettled로 안전하게 폴백합니다.
    const [slidesRes, shortcutsRes] = await Promise.allSettled([slidePromise, shortcutPromise]);
    const dbSlides = slidesRes.status === "fulfilled" ? slidesRes.value : [];
    const dbShortcuts = shortcutsRes.status === "fulfilled" ? shortcutsRes.value : [];

    if (Array.isArray(dbSlides) && dbSlides.length > 0) {
      heroSlides = dbSlides
        .map((s: any) => ({
          href: s.linkUrl || "#",
          image: s.imageUrl,
          imageVersion: s.updatedAt ? new Date(s.updatedAt).toISOString() : s.createdAt ? new Date(s.createdAt).toISOString() : undefined,
          tag: s.tag || "",
          title: s.titleHtml || "",
          subtitle: s.subtitle || "",
        }))
        .filter((s: any) => s.image && s.title);
      if (!heroSlides.length) heroSlides = undefined;
    }

    if (Array.isArray(dbShortcuts) && dbShortcuts.length > 0) {
      shortcutItems = dbShortcuts
        .map((s: any) => ({
          href: s.linkUrl,
          image: s.imageUrl,
          imageVersion: s.updatedAt ? new Date(s.updatedAt).toISOString() : s.createdAt ? new Date(s.createdAt).toISOString() : undefined,
          label: s.label,
          bgColor: s.bgColor || null,
          schoolLogoUrl: s.schoolLogoUrl || null,
        }))
        .filter((s: any) => s.href && s.image && s.label);
      if (!shortcutItems.length) shortcutItems = undefined;
    }
  } catch (e) {
    // server component에서 console.error는 dev overlay를 크게 띄울 수 있어 warn으로 낮춤(개발에서만)
    if (process.env.NODE_ENV !== "production") {
      console.warn("[home] failed to load hero/shortcut settings (fallback to defaults):", e);
    }
    heroSlides = undefined;
    shortcutItems = undefined;
  }

  // 스토어(교재/강좌) 프리뷰: DB 이슈가 있어도 홈 전체가 죽지 않게 안전 폴백
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
      gradeCategory: true;
      thumbnailUrl: true;
      updatedAt: true;
      rating: true;
      reviewCount: true;
    };
  }>;

  let storeCourses: DbCourseRow[] = [];
  let storeTextbooks: DbTextbookRow[] = [];
  let courseReviewStats = new Map<string, { count: number; avg: number }>();
  let textbookReviewStats = new Map<string, { count: number; avg: number }>();
  try {
    const coursesPromise = (async () => {
      let rows = await prisma.course.findMany({
        where: {
          isPublished: true,
          // "강좌 판매하기" 기준: 판매가/정가 중 하나라도 설정된 강좌만 노출
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
          thumbnailUrl: true,
          thumbnailStoredPath: true,
          updatedAt: true,
          isSoldOut: true,
          rating: true,
          reviewCount: true,
        },
        // "내 강좌 목록"과 동일 정렬: position asc → updatedAt desc → createdAt desc
        orderBy: [{ position: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
        take: 12,
      });
      return rows;
    })();

    const baseTextbookWhere: Prisma.TextbookWhereInput = {
      isPublished: true,
      // /store(책 구매 페이지)와 동일 기준: 판매가/정가 중 하나라도 설정된 교재만 노출
      OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
    };
    const textbookWhere = baseTextbookWhere;

    const textbooksPromise = (async () => {
      try {
        let rows = await prisma.textbook.findMany({
          where: textbookWhere,
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            price: true,
            originalPrice: true,
            tags: true,
            textbookType: true,
            gradeCategory: true,
            thumbnailUrl: true,
            updatedAt: true,
            isSoldOut: true,
            rating: true,
            reviewCount: true,
          },
          orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          take: 200,
        });
        return rows;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[home] store textbooks query failed with position order, fallback to createdAt:", msg);
        }
        let rows = await prisma.textbook.findMany({
          where: textbookWhere,
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            price: true,
            originalPrice: true,
            tags: true,
            textbookType: true,
            gradeCategory: true,
            thumbnailUrl: true,
            updatedAt: true,
            isSoldOut: true,
            rating: true,
            reviewCount: true,
          },
          orderBy: [{ createdAt: "desc" }],
          take: 200,
        });
        return rows;
      }
    })();

    const [coursesRes, textbooksRes] = await Promise.allSettled([coursesPromise, textbooksPromise]);
    storeCourses = coursesRes.status === "fulfilled" ? coursesRes.value : [];
    storeTextbooks = textbooksRes.status === "fulfilled" ? textbooksRes.value : [];

    // 리뷰 집계값이 DB에 반영되지 않은 경우를 대비한 보정(홈 프리뷰 표시용)
    try {
      if (storeCourses.length > 0) {
        const courseIds = storeCourses.map((c) => c.id);
        const rows = await prisma.review.groupBy({
          by: ["courseId"],
          where: { productType: "COURSE", courseId: { in: courseIds }, isApproved: true },
          _count: { _all: true },
          _avg: { rating: true },
        });
        courseReviewStats = new Map(
          rows
            .filter((r) => r.courseId)
            .map((r) => [
              r.courseId as string,
              {
                count: r._count._all ?? 0,
                avg: Math.round(((r._avg.rating ?? 0) as number) * 10) / 10,
              },
            ])
        );
      }

      if (storeTextbooks.length > 0) {
        const textbookIds = storeTextbooks.map((t) => t.id);
        const rows = await prisma.review.groupBy({
          by: ["textbookId"],
          where: { productType: "TEXTBOOK", textbookId: { in: textbookIds }, isApproved: true },
          _count: { _all: true },
          _avg: { rating: true },
        });
        textbookReviewStats = new Map(
          rows
            .filter((r) => r.textbookId)
            .map((r) => [
              r.textbookId as string,
              {
                count: r._count._all ?? 0,
                avg: Math.round(((r._avg.rating ?? 0) as number) * 10) / 10,
              },
            ])
        );
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[home] failed to load review stats:", msg);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[home] failed to load store products:", msg);
    }
    storeCourses = [];
    storeTextbooks = [];
  }

  const coursePreview: StorePreviewProduct[] = storeCourses.map((c) => {
    const tags = (c.tags as string[] | null) || [];
    const stats = courseReviewStats.get(c.id);
    return {
      id: c.id,
      title: c.title,
      subject: c.subjectName || "미분류",
      teacher: c.teacherName || "선생님",
      price: c.price || 0,
      originalPrice: c.originalPrice,
      isFree: false,
      isSoldOut: Boolean((c as any).isSoldOut),
      tags,
      textbookType: null,
      type: "course" as const,
      // StorePreviewTabs는 썸네일을 항상 /api/.../thumbnail로 가져오므로
      // 여기서는 "썸네일이 있는지"만 나타내는 작은 값만 유지합니다(베이스64 payload 방지).
      thumbnailUrl: c.thumbnailUrl ? "__thumb__" : null,
      thumbnailStoredPath: c.thumbnailStoredPath,
      thumbnailUpdatedAtISO: c.updatedAt.toISOString(),
      rating: stats ? stats.avg : c.rating,
      reviewCount: stats ? stats.count : c.reviewCount,
    };
  });

  const textbookPreview: StorePreviewProduct[] = storeTextbooks.map((t) => {
    const tags = (t.tags as string[] | null) || [];
    const stats = textbookReviewStats.get(t.id);
    return {
      id: t.id,
      title: t.title,
      subject: t.subjectName || "교재",
      teacher: t.teacherName || "선생님",
      price: t.price || 0,
      originalPrice: t.originalPrice,
      isFree: typeof t.price === "number" && t.price === 0,
      isSoldOut: Boolean((t as any).isSoldOut),
      tags,
      textbookType: (t as { textbookType?: string | null }).textbookType ?? null,
      gradeCategory: (t as { gradeCategory?: "G1_2" | "SUNEUNG" | "TRANSFER" | null }).gradeCategory ?? null,
      type: "textbook" as const,
      // StorePreviewTabs는 썸네일을 항상 /api/.../thumbnail로 가져오므로
      // 여기서는 "썸네일이 있는지"만 나타내는 작은 값만 유지합니다(베이스64 payload 방지).
      thumbnailUrl: t.thumbnailUrl ? "__thumb__" : null,
      thumbnailUpdatedAtISO: t.updatedAt.toISOString(),
      rating: stats ? stats.avg : t.rating,
      reviewCount: stats ? stats.count : t.reviewCount,
    };
  });

  return (
    <Suspense
      // NOTE: Next(app router)에서 스트리밍/리로드 타이밍에 따라 최상단이 Suspense로 잡히는 경우가 있어,
      // 서버/클라이언트의 루트 트리를 안정적으로 맞추기 위해 명시적으로 감쌉니다.
      fallback={<div className="min-h-screen bg-[#161616] text-white overflow-x-hidden" />}
    >
      <div suppressHydrationWarning className="min-h-screen bg-[#161616] text-white overflow-x-hidden">
        {/* Floating Kakao Button */}
        <FloatingKakaoButton />

        {/* Navigation */}
        <HomeLandingHeaderClient />

        {/* Admin-managed popups */}
        <PopupLayerClient />

        {/* Hero Carousel */}
        <HeroCarousel slides={heroSlides} />

        {/* Shortcut Navigation */}
        <ShortcutNav items={shortcutItems} />

        {/* 교재 및 강의 구매(스토어) - 바로가기 아래 배치 */}
        <div className="pb-20">
          <StorePreviewTabs courses={coursePreview} textbooks={textbookPreview} variant="sections" />
        </div>

        {/* Footer */}
        <footer suppressHydrationWarning className="bg-[#131313] pt-16 pb-12">
        <div className="mx-auto max-w-6xl px-4">
          {/* 모바일 푸터 (PC는 기존 그대로 유지) */}
          <div className="md:hidden">
            {/* 로고 및 설명 */}
            <div>
              <Image
                src="/unova-logo.png"
                alt="UNOVA"
                width={120}
                height={24}
                className="h-5 w-auto"
              />
              <p className="mt-5 text-[12px] text-white/50 leading-relaxed">
                당신이 노바가 될 수 있도록,<br />
                가장 실전적인 지식을 제공합니다
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-x-5 gap-y-8">
              <div>
                <p className="font-bold text-white mb-3 text-[13px]">서비스</p>
                <ul className="space-y-2 text-[12px] text-white/50">
                  <li>
                    <Link href="https://unova.co.kr" target="_blank" className="hover:text-white transition-colors">
                      구매하기
                    </Link>
                  </li>
                  <li>
                    <Link href="https://unova.co.kr" target="_blank" className="hover:text-white transition-colors">
                      이벤트
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-white transition-colors">
                      나의 컨텐츠
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-white mb-3 text-[13px]">고객지원</p>
                <ul className="space-y-2 text-[11px] text-white/50">
                  <li>
                    <Link href="/notices" className="hover:text-white transition-colors whitespace-nowrap tracking-tight">
                      강의/결제 공지사항
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-white transition-colors">
                      이용약관
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="hover:text-white transition-colors whitespace-nowrap tracking-tight">
                      개인정보처리방침
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-white mb-3 text-[13px]">SNS</p>
                <ul className="space-y-2 text-[12px] text-white/50">
                  <li>
                    <a
                      href="https://www.instagram.com/unova_study/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      인스타그램
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/@unova_edu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      유튜브
                    </a>
                  </li>
                  <li>
                    <Link href="/teachers" className="hover:text-white transition-colors">
                      유노바 선생님
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 상단 4열 구조 (PC 현재 상태 유지) */}
          <div className="hidden md:grid md:grid-cols-4 gap-10 md:gap-8">
            {/* 로고 및 설명 */}
            <div className="md:col-span-1">
              <Image
                src="/unova-logo.png"
                alt="UNOVA"
                width={120}
                height={24}
                className="h-5 w-auto"
              />
              <p className="mt-6 text-[14px] text-white/50 leading-relaxed">
                당신이 노바가 될 수 있도록,<br />
                가장 실전적인 지식을 제공합니다
              </p>
            </div>

            {/* 서비스 */}
              <div>
              <p className="font-bold text-white mb-4">서비스</p>
              <ul className="space-y-2.5 text-[14px] text-white/50">
                  <li>
                  <Link href="https://unova.co.kr" target="_blank" className="hover:text-white transition-colors">
                    구매하기
                  </Link>
                </li>
                <li>
                  <Link href="https://unova.co.kr" target="_blank" className="hover:text-white transition-colors">
                    이벤트
                    </Link>
                  </li>
                  <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    나의 컨텐츠
                    </Link>
                  </li>
                </ul>
              </div>

            {/* 고객지원 */}
              <div>
              <p className="font-bold text-white mb-4">고객지원</p>
              <ul className="space-y-2.5 text-[14px] text-white/50">
                  <li>
                  <Link href="/notices" className="hover:text-white transition-colors">
                    강의 / 결제 공지사항
                    </Link>
                  </li>
                  <li>
                  <a href="https://unova.co.kr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="https://unova.co.kr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    개인정보처리방침
                    </a>
                  </li>
                </ul>
              </div>

            {/* SNS */}
              <div>
              <p className="font-bold text-white mb-4">SNS</p>
              <ul className="space-y-2.5 text-[14px] text-white/50">
                  <li>
                    <a
                      href="https://www.instagram.com/unova_study/"
                      target="_blank"
                      rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                    >
                      인스타그램
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/@unova_edu"
                      target="_blank"
                      rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                    >
                      유튜브
                    </a>
                  </li>
                <li>
                  <Link href="/teachers" className="hover:text-white transition-colors">
                    유노바 선생님
                  </Link>
                  </li>
                </ul>
            </div>
          </div>

          {/* 구분선 */}
          <div className="mt-12 pt-8 border-t border-white/10">
            {/* 사업자 정보 - PC에서는 한 줄, 모바일에서는 항목별 줄바꿈 */}
            <div className="text-white/40 leading-relaxed md:text-[13px] text-[11px]">
              {/* PC 버전 */}
              <div className="hidden md:block">
              <p>
                  상호 : 유노바 · 대표 : 장진우 · 개인정보책임관리자 : 장진우 · 사업자등록번호 : 259-40-01233 · 소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호 a411 · TEL : 050-6678-6390
              </p>
              <p className="mt-1">
                이메일 : unova.team.cs@gmail.com · 운영시간 : 평일 13:00~21:00, 토요일 13:00~18:00, 일요일 휴무 · 통신판매업 신고번호 : 2024-서울강남-06080 · 출판사 신고번호 : 제2025-232호
              </p>
              </div>

              {/* 모바일 버전 */}
              <div className="md:hidden space-y-1.5">
                <p>상호 : 유노바 · 대표 : 장진우</p>
                <p>개인정보책임관리자 : 장진우</p>
                <p>사업자등록번호 : 259-40-01233</p>
                <p>소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호 a411</p>
                <p>TEL : 050-6678-6390</p>
                <p>이메일 : unova.team.cs@gmail.com</p>
                <p>운영시간 : 평일 13:00~21:00, 토요일 13:00~18:00, 일요일 휴무</p>
                <p>통신판매업 신고번호 : 2024-서울강남-06080</p>
                <p>출판사 신고번호 : 제2025-232호</p>
              </div>
            </div>

            {/* 저작권 */}
            <p className="mt-6 text-white/40 md:text-[13px] text-[11px]">
              COPYRIGHT 2024. UNOVA. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
        </footer>
      </div>
    </Suspense>
  );
}
