import Image from "next/image";
import Link from "next/link";
import LandingHeader from "./_components/LandingHeader";
import HeroCarousel, { type HeroCarouselSlide } from "./_components/HeroCarousel";
import ShortcutNav, { type ShortcutNavItem } from "./_components/ShortcutNav";
import ScrollProgress from "./_components/ScrollProgress";
import FloatingKakaoButton from "./_components/FloatingKakaoButton";
import PopupLayerClient from "./_components/PopupLayerClient";
import StorePreviewTabs, { type StorePreviewProduct } from "./_components/StorePreviewTabs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function getStoreOwnerEmail(): string {
  // StorePage와 동일하게 관리자 이메일 소유 상품만 홈에도 노출
  return (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
}

export default async function HomePage() {
  const storeOwnerEmail = getStoreOwnerEmail();

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

    const [dbSlides, dbShortcuts] = await Promise.all([slidePromise, shortcutPromise]);

    if (Array.isArray(dbSlides) && dbSlides.length > 0) {
      heroSlides = dbSlides
        .map((s: any) => ({
          href: s.linkUrl || "#",
          image: s.imageUrl,
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
          label: s.label,
          bgColor: s.bgColor || null,
        }))
        .filter((s: any) => s.href && s.image && s.label);
      if (!shortcutItems.length) shortcutItems = undefined;
    }
  } catch (e) {
    console.error("[home] failed to load hero/shortcut settings (fallback to defaults):", e);
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
      thumbnailUrl: true;
      rating: true;
      reviewCount: true;
    };
  }>;

  let storeCourses: DbCourseRow[] = [];
  let storeTextbooks: DbTextbookRow[] = [];
  try {
    [storeCourses, storeTextbooks] = await Promise.all([
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
          rating: true,
          reviewCount: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      (async () => {
        try {
          return await prisma.textbook.findMany({
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
              rating: true,
              reviewCount: true,
            },
            orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          });
        } catch (e) {
          console.error("[home] store textbooks query failed with position order, fallback to createdAt:", e);
          return await prisma.textbook.findMany({
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
              rating: true,
              reviewCount: true,
            },
            orderBy: [{ createdAt: "desc" }],
          });
        }
      })(),
    ]);
  } catch (e) {
    console.error("[home] failed to load store products:", e);
    storeCourses = [];
    storeTextbooks = [];
  }

  const coursePreview: StorePreviewProduct[] = storeCourses.map((c) => {
    const tags = (c.tags as string[] | null) || [];
    return {
      id: c.id,
      title: c.title,
      subject: c.subjectName || "미분류",
      teacher: c.teacherName || "선생님",
      price: c.price || 0,
      originalPrice: c.originalPrice,
      tags,
      type: "course" as const,
      thumbnailUrl: c.thumbnailUrl,
      rating: c.rating,
      reviewCount: c.reviewCount,
    };
  });

  const textbookPreview: StorePreviewProduct[] = storeTextbooks.map((t) => {
    const tags = (t.tags as string[] | null) || [];
    return {
      id: t.id,
      title: t.title,
      subject: t.subjectName || "교재",
      teacher: t.teacherName || "선생님",
      price: t.price || 0,
      originalPrice: t.originalPrice,
      tags,
      type: "textbook" as const,
      thumbnailUrl: t.thumbnailUrl,
      rating: t.rating,
      reviewCount: t.reviewCount,
    };
  });

  return (
    <div className="min-h-screen bg-[#161616] text-white overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <ScrollProgress />

      {/* Floating Kakao Button */}
      <FloatingKakaoButton />

      {/* Navigation */}
      <LandingHeader />

      {/* Admin-managed popups */}
      <PopupLayerClient />

      {/* Hero Carousel */}
      <HeroCarousel slides={heroSlides} />

      {/* Shortcut Navigation */}
      <ShortcutNav items={shortcutItems} />

      {/* 교재 및 강의 구매(스토어) - 바로가기 아래 배치 */}
      <div className="pb-20">
        <StorePreviewTabs courses={coursePreview} textbooks={textbookPreview} />
      </div>

      {/* Footer */}
      <footer className="bg-[#131313] pt-16 pb-12">
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
              <p className="mt-5 text-[13px] text-white/50 leading-relaxed">
                당신이 노바가 될 수 있도록,<br />
                가장 실전적인 지식을 제공합니다
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-8">
              <div>
                <p className="font-bold text-white mb-3 text-[14px]">서비스</p>
                <ul className="space-y-2 text-[13px] text-white/50">
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
                <p className="font-bold text-white mb-3 text-[14px]">고객지원</p>
                <ul className="space-y-2 text-[13px] text-white/50">
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
              <div>
                <p className="font-bold text-white mb-3 text-[14px]">SNS</p>
                <ul className="space-y-2 text-[13px] text-white/50">
                  <li>
                    <a
                      href="https://www.instagram.com/unova_edu"
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
                    <a
                      href="https://unova.co.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      채용 공고
                    </a>
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
                      href="https://www.instagram.com/unova_edu"
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
                  <a
                    href="https://unova.co.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    채용 공고
                    </a>
                  </li>
                </ul>
            </div>
          </div>

          {/* 구분선 */}
          <div className="mt-12 pt-8 border-t border-white/10">
            {/* 사업자 정보 */}
            <div className="text-[13px] text-white/40 leading-relaxed">
              <p>
                상호 : 유노바 · 대표 : 장진우 · 개인정보책임관리자 : 장진우 · 사업자등록번호 : 259-40-01233 · <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2594001233" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">사업자정보확인</a> · 소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호 a411 · TEL : 050-6678-6390
              </p>
              <p className="mt-1">
                이메일 : unova.team.cs@gmail.com · 운영시간 : 평일 13:00~21:00, 토요일 13:00~18:00, 일요일 휴무 · 통신판매업 신고번호 : 2024-서울강남-06080
              </p>
            </div>

            {/* 저작권 */}
            <p className="mt-6 text-[13px] text-white/40">
              COPYRIGHT 2024. UNOVA. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
