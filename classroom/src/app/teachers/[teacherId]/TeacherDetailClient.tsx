'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import Image from 'next/image';
import CurriculumCarousel, { CurriculumSlide } from './CurriculumCarousel';
import BookCoverFlow, { BookSet } from './BookCoverFlow';
import LectureRail, { LectureSet } from './LectureRail';
import StorePreviewTabs, { type StorePreviewProduct, type StorePreviewProductGroupSection } from "@/app/_components/StorePreviewTabs";
import type { YoutubeVideo } from './YoutubeMarquee';
import type { FAQItem } from './FAQSection';

type Banner = {
  topText: string;
  title: string;
  isNew?: boolean;
  type: 'banner1' | 'banner2';
};

type Review = {
  text: string;
  rating: number;
  authorName?: string;
  createdAt?: string; // ISO
};

type Notice = {
  tag: 'book' | 'event' | 'notice';
  text: string;
  href?: string;
  authorName?: string;
  createdAt?: string; // ISO
};

type FloatingBanner = {
  sub: string;
  title: string;
  desc: string;
  gradient: 'box1' | 'box2';
};

type ProfileSection = {
  title: string;
  content: string | string[];
};

export type TeacherDetailTeacher = {
  slug: string;
  name: string;
  subject: string;
  subjectColor: string;
  bgColor: string;
  headerSub: string;
  imageUrl: string;
  universityIconUrl?: string;
  promoImageUrl?: string;
  // 선생님 개인 페이지 커스터마이징(테마)
  pageBgColor?: string;
  newsBgColor?: string;
  // 선생님 개인 페이지: 과목명 텍스트 색상
  subjectTextColor?: string;
  banners: Banner[];
  reviews: Review[];
  ratingSummary?: {
    reviewCount: number;
    avgRating: number;
  };
  notices: Notice[];
  floatingBanners: FloatingBanner[];
  curriculum?: CurriculumSlide[];
  bookSets?: BookSet[];
  lectureSets?: LectureSet[];
  // 메인페이지(스토어 프리뷰)와 동일한 카드 UI를 쓰기 위한 데이터
  storeCourses?: StorePreviewProduct[];
  storeTextbooks?: StorePreviewProduct[];
  curriculumLink?: string;
  youtubeVideos?: YoutubeVideo[];
  faqItems?: FAQItem[];
  profile: {
    education: ProfileSection;
    career: ProfileSection;
  };
  socialLinks: {
    type: 'instagram' | 'youtube';
    url: string;
    icon: string;
  }[];
  navigationLinks: {
    curriculum?: string;
    lecture?: string;
    book?: string;
    board?: string;
  };
};

type Props = {
  teacher: TeacherDetailTeacher;
};

// 모바일 탭 메뉴 타입 (메가스터디 스타일)
type MobileTab = 'intro' | 'lecture' | 'board' | 'review' | 'news';
type LectureSubTab = 'single' | 'package' | 'book';

/**
 * 탭/메뉴 텍스트를 여기서 한 번에 관리합니다.
 * - 모바일 상단 탭, PC 탭, 좌측 메뉴(일부)에서 공통으로 사용
 * - 문구/순서 변경이 필요하면 우선 이 객체만 수정하면 됩니다.
 */
const TAB_LABEL: Record<MobileTab, string> = {
  intro: "선생님 소개",
  lecture: "강좌 및 교재",
  board: "게시판",
  review: "실시간 리뷰",
  news: "새소식",
};

const LECTURE_SUBTAB_LABEL: Record<LectureSubTab, string> = {
  single: "단과강좌",
  package: "패키지강좌",
  book: "교재",
};

export default function TeacherDetailClient({ teacher }: Props) {
  // 모바일 탭 UI 제거(요청사항): 강의/교재를 바로 노출
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeacherLiked, setIsTeacherLiked] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // (모바일 탭 핀 로직 제거됨)
  const containerRef = useRef<HTMLDivElement>(null);
  const isLsy = teacher.slug === "lsy" || teacher.slug === "lee-sangyeob";

  // PC: 상단(보라색) 선생님 섹션에서 휠 스크롤이 "내부 컨테이너"에 잡히는 경우가 있어
  // 항상 페이지(윈도우) 스크롤로 흘려보내도록 보정합니다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // 모바일/태블릿은 해당 이슈가 없으므로 건드리지 않음
      if (window.innerWidth <= 1000) return;
      // 모달이 열려 있으면 모달 스크롤을 우선
      if (isModalOpen) return;
      // Ctrl+휠(브라우저 확대/축소)은 막지 않음
      if (e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".unova-modal, .unova-modal-overlay")) return;

      window.scrollBy({ top: e.deltaY, left: e.deltaX });
      e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel as any);
    };
  }, [isModalOpen]);

  // ===== 커스터마이징(개인 페이지에서 바로 설정) =====
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState<string>(teacher.subject || "");
  const [pageBgDraft, setPageBgDraft] = useState<string>(teacher.pageBgColor || "");
  const [newsBgDraft, setNewsBgDraft] = useState<string>(teacher.newsBgColor || "");
  const [subjectColorDraft, setSubjectColorDraft] = useState<string>(teacher.subjectTextColor || "");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setShowCustomizer(sp.get("customize") === "1");
  }, []);

  // NOTE: 요청사항(관리자 디자인): "최근 소식 배경색(newsBgColor)"을 설정하면
  // 선생님 페이지의 "학력/약력 컨테이너"와 "실시간 리뷰 컨테이너"도 동일한 배경색을 사용해야 합니다.
  // → newsBgColor를 공통 패널 배경으로 취급하여 --u-news-bg / --u-rating-bg 둘 다에 주입합니다.
  const effectiveNewsBg = (newsBgDraft || teacher.newsBgColor || "") || undefined;
  const themeVars = {
    ["--u-page-bg" as any]: (pageBgDraft || teacher.pageBgColor || "") || undefined,
    ["--u-news-bg" as any]: effectiveNewsBg,
    ["--u-rating-bg" as any]: effectiveNewsBg,
    ["--u-subject-color" as any]: (subjectColorDraft || teacher.subjectTextColor || "") || undefined,
  } as React.CSSProperties;

  const effectiveSubject = (subjectDraft || teacher.subject || "").trim();

  const [liveSummary, setLiveSummary] = useState<{ reviewCount: number; avgRating: number } | null>(
    teacher.ratingSummary && typeof teacher.ratingSummary.reviewCount === "number" && typeof teacher.ratingSummary.avgRating === "number"
      ? teacher.ratingSummary
      : null
  );
  const [liveRecentReviews, setLiveRecentReviews] = useState<Review[]>(() => {
    // 템플릿(테스트) 리뷰가 초기값으로 보이지 않도록:
    // summary(전체 집계)가 "0"이면 초기 최근 리뷰도 빈 배열로 시작
    const cnt = teacher.ratingSummary?.reviewCount;
    if (typeof cnt === "number" && cnt <= 0) return [];
    return Array.isArray(teacher.reviews) ? teacher.reviews : [];
  });

  const reviews = liveRecentReviews;
  const baseSummary =
    teacher.ratingSummary && typeof teacher.ratingSummary.reviewCount === "number" && typeof teacher.ratingSummary.avgRating === "number"
      ? teacher.ratingSummary
      : null;
  const effectiveSummary = liveSummary ?? baseSummary;

  // IMPORTANT: "실시간 리뷰" 카드의 별/리뷰 수는
  // 최근 리스트(reviews.slice) 기준이 아니라, 연동된 상품(강의/교재) 전체 리뷰 집계(summary) 기준으로 표시
  const reviewCount = effectiveSummary?.reviewCount ?? 0;
  const avgRating = effectiveSummary?.avgRating ?? 0;
  const avgRatingText = reviewCount > 0 ? avgRating.toFixed(1) : "0.0";
  const filledStars = Math.max(0, Math.min(5, Math.round(avgRating)));
  const notices = Array.isArray(teacher.notices) ? teacher.notices : [];
  const youtubeVideos = Array.isArray(teacher.youtubeVideos) ? teacher.youtubeVideos : [];

  // PC 우측 패널(선생님 게시글) 하트(좋아요) 상태: 로컬 저장(선생님 slug 기준)
  useEffect(() => {
    try {
      const slug = String(teacher.slug || "").trim();
      if (!slug) return;
      const key = `unova_teacher_like:${slug}`;
      setIsTeacherLiked(localStorage.getItem(key) === "1");
    } catch {
      // ignore
    }
  }, [teacher.slug]);

  const toggleTeacherLike = () => {
    setIsTeacherLiked((prev) => {
      const next = !prev;
      try {
        const slug = String(teacher.slug || "").trim();
        if (slug) {
          const key = `unova_teacher_like:${slug}`;
          if (next) localStorage.setItem(key, "1");
          else localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  // PC 공유 메뉴: (1) 기기 공유(Web Share) (2) 링크 복사
  const shareUrl = () => {
    try {
      return window.location.href;
    } catch {
      return "";
    }
  };

  const handleShareDevice = async () => {
    try {
      const url = shareUrl();
      const title = `${teacher.name} 선생님`;

      if (typeof (navigator as any)?.share === "function") {
        await (navigator as any).share({ title, url });
        setShareToast("공유했어요.");
        window.setTimeout(() => setShareToast(null), 1400);
        setIsShareMenuOpen(false);
        return;
      }
      setShareToast("이 기기에서는 공유가 지원되지 않아요.");
      window.setTimeout(() => setShareToast(null), 1600);
    } catch {
      setShareToast("공유에 실패했어요.");
      window.setTimeout(() => setShareToast(null), 1400);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = shareUrl();
      if (!url) return;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareToast("링크를 복사했어요.");
        window.setTimeout(() => setShareToast(null), 1400);
        setIsShareMenuOpen(false);
        return;
      }
      window.prompt("링크를 복사하세요:", url);
      setIsShareMenuOpen(false);
    } catch {
      setShareToast("복사에 실패했어요.");
      window.setTimeout(() => setShareToast(null), 1400);
    }
  };

  // PC 공유 메뉴: 바깥 클릭/ESC 닫기
  useEffect(() => {
    if (!isShareMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = shareMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setIsShareMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsShareMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isShareMenuOpen]);

  const fmtDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "방금 전";
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays === 1) return "어제";
    if (diffDays < 7) return `${diffDays}일 전`;
    return fmtDate(date);
  };

  const relTimeFromIso = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return getRelativeTime(d);
  };

  const maskAuthorName = (name?: string) => {
    const n = (name ?? "").trim();
    if (!n) return "";
    if (n.length === 1) return n;
    return `${n[0]}${"*".repeat(Math.max(1, n.length - 1))}`;
  };

  const stripLeadingScore = (text?: string) => {
    const t = (text ?? "").trim();
    if (!t) return "";
    // 예: "(4.0) ...", "(4점) ...", "4.0/5 ...", "4점 ..." 등 앞쪽 점수 표기 제거
    return t
      .replace(/^\(\s*\d+(\.\d+)?\s*\)\s*/g, "")
      .replace(/^\(\s*\d+(\.\d+)?\s*\/\s*5\s*\)\s*/g, "")
      .replace(/^\(\s*\d+\s*점\s*\)\s*/g, "")
      .replace(/^\d+(\.\d+)?\s*\/\s*5\s*/g, "")
      .replace(/^\d+(\.\d+)?\s*점\s*/g, "")
      .trim();
  };

  const renderStars = (rating: number, sizeClass: string) => {
    const filled = Math.max(0, Math.min(5, Math.round(Number.isFinite(rating) ? rating : 0)));
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${sizeClass} ${star <= filled ? "text-yellow-200" : "text-white/20"}`}
            aria-hidden="true"
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatTeacherLabel = (name?: string) => {
    const n = (name || "").trim();
    if (!n) return "";
    return n.includes("선생님") ? n : `${n} 선생님`;
  };

  // 실시간(준실시간) 업데이트: 선생님 강의/교재 리뷰 합산 평점/최근 후기 갱신
  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const fetchRating = async () => {
      try {
        const res = await fetch(`/api/teachers/${encodeURIComponent(teacher.slug)}/rating?name=${encodeURIComponent(teacher.name)}`, {
          signal: controller.signal,
          // 서버에서 짧은 TTL 캐시를 두고 있으므로, 클라에서도 캐시를 허용해 반복 요청 비용을 줄입니다.
          cache: "force-cache",
        });
        const data = await res.json().catch(() => null);
        if (!isActive || !data?.ok || !data?.summary) return;

        const summary = data.summary;
        if (typeof summary.reviewCount === "number" && typeof summary.avgRating === "number") {
          setLiveSummary({ reviewCount: summary.reviewCount, avgRating: summary.avgRating });
        }
        if (Array.isArray(summary.recentReviews)) {
          setLiveRecentReviews(
            summary.recentReviews.slice(0, 3).map((r: any) => ({
              text: typeof r?.content === "string" ? r.content : "",
              rating: typeof r?.rating === "number" ? r.rating : 0,
              authorName: typeof r?.authorName === "string" ? r.authorName : undefined,
              createdAt: typeof r?.createdAt === "string" ? r.createdAt : undefined,
            }))
          );
        }
      } catch {
        // ignore
      }
    };

    // 최초 1회 + 60초 폴링(운영에서 "실시간"일 필요는 없고, DB 부하/체감 렉을 줄이는 게 우선)
    fetchRating();
    const id = window.setInterval(fetchRating, 60000);
    return () => {
      isActive = false;
      controller.abort();
      window.clearInterval(id);
    };
  }, [teacher.slug, teacher.name]);

  const getYoutubeId = (url: string) => {
    try {
      const u = new URL(url);
      // watch?v=ID
      const v = u.searchParams.get("v");
      if (v) return v;
      // youtu.be/ID
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        return id || null;
      }
      // /embed/ID or /shorts/ID
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
      return null;
    } catch {
      return null;
    }
  };

  const mainYoutube = youtubeVideos[0]?.url;
  const mainYoutubeId = typeof mainYoutube === "string" ? getYoutubeId(mainYoutube) : null;
  const embedSrc = mainYoutubeId ? `https://www.youtube-nocookie.com/embed/${mainYoutubeId}` : null;
  const showYoutube = false; // 요청사항: 선생님 페이지에서 유튜브 영상 숨김

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('unova-no-scroll');
    } else {
      document.body.classList.remove('unova-no-scroll');
    }
    return () => {
      document.body.classList.remove('unova-no-scroll');
    };
  }, [isModalOpen]);

  const handleNavClick = (hash?: string, url?: string) => {
    if (url) {
      window.location.href = url;
      return;
    }
    if (hash) {
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.history && typeof window.history.pushState === 'function') {
          window.history.pushState(null, '', hash);
        } else {
          window.location.hash = hash;
        }
      } else {
        window.location.hash = hash;
      }
    }
  };

  const menu = (
    <div className="unova-inline-menu">
      <div className="unova-sidebar">
        <div
          className="unova-menu-item"
          onClick={() => setIsModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsModalOpen(true);
            }
          }}
        >
          학력/약력
        </div>
        {teacher.navigationLinks.lecture && (
          <div
            className="unova-menu-item"
            onClick={() => handleNavClick("#teacher-pc-courses")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick("#teacher-pc-courses");
              }
            }}
          >
            선생님 강좌<span className="unova-inline-n">N</span>
          </div>
        )}
        {teacher.navigationLinks.book && (
          <div
            className="unova-menu-item"
            onClick={() => handleNavClick("#teacher-pc-textbooks")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick("#teacher-pc-textbooks");
              }
            }}
          >
            선생님 교재<span className="unova-inline-n">N</span>
          </div>
        )}
        {teacher.navigationLinks.board && (
          <div
            className="unova-menu-item"
            onClick={() => handleNavClick(undefined, teacher.navigationLinks.board)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick(undefined, teacher.navigationLinks.board);
              }
            }}
          >
            <span className="hidden md:inline">선생님 {TAB_LABEL.board}</span>
            <span className="md:hidden">{TAB_LABEL.board}</span>
            <span className="unova-inline-n">N</span>
          </div>
        )}

        {teacher.socialLinks.map((social, idx) => (
          <a
            key={idx}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="unova-menu-item unova-menu-static"
            aria-label={`${teacher.name} 선생님 ${social.type === "instagram" ? "인스타그램" : "유튜브"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={social.icon} alt={`${social.type} 아이콘`} className="unova-menu-icon" />
            {teacher.name}T {social.type === "instagram" ? "인스타그램" : "유튜브"}
          </a>
        ))}
      </div>
    </div>
  );

  // 강좌 데이터 분류
  const singleLectures = teacher.lectureSets?.filter(ls => !ls.id.includes('package')) || [];
  const packageLectures = teacher.lectureSets?.filter(ls => ls.id.includes('package')) || [];

  // 선생님 페이지 교재: 물리(장진우/jjw) 요청사항
  // - 실물책 구매하기 / 전자책 구매하기로 구분
  // - 각 섹션에 물리학I/II 2개 그룹(각 3개 상품)
  // - 책 순서: 역학+비역학 → 역학 → 비역학
  const textbookGroupSections: StorePreviewProductGroupSection[] | undefined = (() => {
    const slug = String(teacher.slug || "").trim().toLowerCase();
    if (slug !== "jjw" && slug !== "bhu") return undefined;

    const src = Array.isArray(teacher.storeTextbooks) ? teacher.storeTextbooks : [];
    const paid = src.filter((p) => !p.isFree);

    const norm = (s: unknown) => String(s ?? "").replace(/\s+/g, "").toUpperCase();
    const topicRank = (p: StorePreviewProduct): number => {
      const t = String(p.title ?? "").replace(/\s+/g, "");
      // 요청 순서: 역학+비역학 → 역학 → 비역학
      // NOTE: "비역학"에 "역학"이 포함되어 있어 includes("(역학)") 같은 단순 매칭은 오탐 위험이 있으므로
      // 괄호 포함 패턴을 우선으로 정확히 분기합니다.
      if (/\(역학\+비역학\)/.test(t) || /역학\+비역학/.test(t)) return 0;
      if (/\(역학\)/.test(t)) return 1;
      if (/\(비역학\)/.test(t)) return 2;
      return 9;
    };
    const sortByTopic = (arr: StorePreviewProduct[]): StorePreviewProduct[] => {
      return arr
        .map((p, idx) => ({ p, idx, r: topicRank(p) }))
        .sort((a, b) => (a.r - b.r) || (a.idx - b.idx))
        .map((x) => x.p);
    };

    const getLevel = (p: StorePreviewProduct): "I" | "II" | null => {
      const s = norm(p.subject);
      const t = norm(p.title);
      // II 먼저 체크( I 포함 오탐 방지 )
      if (s.includes("물리학II") || s.includes("물리학2") || t.includes("물리학II") || t.includes("물리학2")) return "II";
      if (s.includes("물리학I") || s.includes("물리학1") || t.includes("물리학I") || t.includes("물리학1")) return "I";
      return null;
    };

    const isEbook = (p: StorePreviewProduct): boolean => {
      const tt = norm(p.textbookType);
      if (tt === "PDF") return true;
      // 운영상 title이 "PDF ..."로 시작하는 케이스도 있어 폴백
      const t = String(p.title ?? "").trim().toUpperCase();
      return t.startsWith("PDF ");
    };

    // ===== bhu(백하욱) 요청사항: 실물책/전자책으로 분리 + CONNECT 수학 라벨 =====
    if (slug === "bhu") {
      const mathRank = (p: StorePreviewProduct): number => {
        // 요청 순서:
        // 1) 수학I+II+미적분
        // 2) 수학I+II+확률과통계
        // 3) 수학I
        // 4) 수학II
        // 5) 미적분
        // 6) 확률과통계
        const t = String(p.title ?? "").replace(/\s+/g, "");
        // 조합 우선
        if (t.includes("수학I+II+미적분")) return 0;
        if (t.includes("수학I+II+확률과통계")) return 1;
        // 단과 (주의: "수학II"에 "수학I"가 포함되므로 II를 먼저 체크)
        if (t.includes("수학II")) return 3;
        if (t.includes("수학I")) return 2;
        if (t.includes("미적분")) return 4;
        if (t.includes("확률과통계")) return 5;
        return 9;
      };
      const sortByMathOrder = (arr: StorePreviewProduct[]): StorePreviewProduct[] => {
        return arr
          .map((p, idx) => ({ p, idx, r: mathRank(p) }))
          .sort((a, b) => (a.r - b.r) || (a.idx - b.idx))
          .map((x) => x.p);
      };

      const print = paid.filter((p) => !isEbook(p));
      const ebook = paid.filter((p) => isEbook(p));
      return [
        {
          id: "print",
          title: "실물책 구매하기",
          groups: [{ id: "bhu-print", title: "CONNECT 수학", products: sortByMathOrder(print) }],
        },
        {
          id: "ebook",
          title: "전자책 구매하기",
          groups: [{ id: "bhu-ebook", title: "CONNECT 수학", products: sortByMathOrder(ebook) }],
        },
      ] satisfies StorePreviewProductGroupSection[];
    }

    const p1Print: StorePreviewProduct[] = [];
    const p2Print: StorePreviewProduct[] = [];
    const p1Ebook: StorePreviewProduct[] = [];
    const p2Ebook: StorePreviewProduct[] = [];

    for (const p of paid) {
      const level = getLevel(p);
      if (!level) continue;
      const ebook = isEbook(p);
      if (level === "I") (ebook ? p1Ebook : p1Print).push(p);
      if (level === "II") (ebook ? p2Ebook : p2Print).push(p);
    }

    const printGroups = [
      { id: "phy1-print", title: "CONNECT 물리학I", products: sortByTopic(p1Print).slice(0, 3) },
      // NOTE: 사용자 요청 문구 그대로("CONENCT") 반영
      { id: "phy2-print", title: "CONENCT 물리학II", products: sortByTopic(p2Print).slice(0, 3) },
    ];
    const ebookGroups = [
      { id: "phy1-ebook", title: "CONNECT 물리학I", products: sortByTopic(p1Ebook).slice(0, 3) },
      { id: "phy2-ebook", title: "CONNECT 물리학II", products: sortByTopic(p2Ebook).slice(0, 3) },
    ];

    return [
      { id: "print", title: "실물책 구매하기", groups: printGroups },
      { id: "ebook", title: "전자책 구매하기", groups: ebookGroups },
    ] satisfies StorePreviewProductGroupSection[];
  })();

  return (
    <>
      {/* ============ 모바일 전용 레이아웃 (메가스터디 스타일) ============ */}
      <div className="mega-mobile-layout" style={themeVars}>
        {showCustomizer && (
          <div style={{ padding: "12px 16px 0" }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.18)",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>페이지 커스터마이징</div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                  과목명
                  <input
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    placeholder="예: 영어"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                    }}
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    뒤 배경색
                    <input
                      type="color"
                      value={(pageBgDraft && pageBgDraft.startsWith("#")) ? pageBgDraft : "#464065"}
                      onChange={(e) => setPageBgDraft(e.target.value)}
                      style={{ width: "100%", height: 40, background: "transparent", border: 0, padding: 0 }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    최근 소식 컨테이너
                    <input
                      type="color"
                      value={(newsBgDraft && newsBgDraft.startsWith("#")) ? newsBgDraft : "#2A263D"}
                      onChange={(e) => setNewsBgDraft(e.target.value)}
                      style={{ width: "100%", height: 40, background: "transparent", border: 0, padding: 0 }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    과목명 색상
                    <input
                      type="color"
                      value={(subjectColorDraft && subjectColorDraft.startsWith("#")) ? subjectColorDraft : "#957FF3"}
                      onChange={(e) => setSubjectColorDraft(e.target.value)}
                      style={{ width: "100%", height: 40, background: "transparent", border: 0, padding: 0 }}
                    />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    disabled={isSavingTheme}
                    onClick={async () => {
                      try {
                        setIsSavingTheme(true);
                        const res = await fetch("/api/admin/teachers/theme", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            slug: teacher.slug,
                            subjectName: subjectDraft.trim(),
                            pageBgColor: pageBgDraft || null,
                            newsBgColor: newsBgDraft || null,
                            subjectTextColor: subjectColorDraft || null,
                          }),
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok || !json?.ok) throw new Error("SAVE_FAILED");
                        alert("저장되었습니다. (새로고침 시에도 유지됩니다)");
                      } catch {
                        alert("저장에 실패했습니다.");
                      } finally {
                        setIsSavingTheme(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "#3b82f6",
                      border: 0,
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTheme}
                    onClick={() => {
                      setPageBgDraft("");
                      setNewsBgDraft("");
                      setSubjectColorDraft("");
                    }}
                    style={{
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    초기화
                  </button>
                </div>
                <div style={{ fontSize: 11, opacity: 0.65 }}>
                  팁: URL에 <b>?customize=1</b>을 붙이면 이 설정창이 표시됩니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 헤더 아래 얇은 이벤트 바 */}
        {/* (요청사항) 모바일 이벤트 바 제거 */}

        {/* 히어로 섹션 */}
        <div className="mega-mobile-hero">
          <div className="mega-mobile-hero__bg" />
          <div className="mega-mobile-hero__content">
            <div className="mega-mobile-hero__info">
              {teacher.headerSub ? (
                <p className="mega-mobile-hero__catchphrase">
                  {teacher.headerSub}
                </p>
              ) : null}
              <h1 className="mega-mobile-hero__name">
                <span className="mega-mobile-hero__subject">{effectiveSubject}</span> {teacher.name} 선생님
              </h1>
              <button
                type="button"
                className="mega-mobile-hero__profile-btn"
                onClick={() => setIsModalOpen(true)}
              >
                학력/약력
              </button>
              {/* 별점/리뷰 정보 */}
              {reviewCount > 0 && (
                <div className="mega-mobile-hero__rating">
                  <span className="mega-mobile-hero__stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < filledStars ? "is-on" : "is-off"}>★</span>
                    ))}
                  </span>
                  <span className="mega-mobile-hero__score">{avgRatingText}<small>/5</small></span>
                </div>
              )}
              {/* 버튼 아래: 공지 대신 리뷰 노출 (스타일 유지) */}
              {(reviews.length > 0 || notices.length > 0) && (
                <div className="mega-mobile-hero__notices">
                  {reviews.length > 0
                    ? reviews.slice(0, 2).map((r, idx) => (
                        <div key={idx} className="mega-mobile-notice">
                          <span className="mega-mobile-notice__tag">[리뷰]</span>
                          <span className="mega-mobile-notice__text">
                            {stripLeadingScore(r.text)}
                            {r.authorName ? (
                              <span className="mega-mobile-notice__author"> · {maskAuthorName(r.authorName)}</span>
                            ) : null}
                          </span>
                        </div>
                      ))
                    : notices.slice(0, 2).map((n, idx) => (
                        <div key={idx} className="mega-mobile-notice">
                          <span className="mega-mobile-notice__tag">[공지]</span>
                          {typeof n.href === "string" && n.href.length > 0 ? (
                            <Link href={n.href} className="mega-mobile-notice__text">
                              {n.text}
                            </Link>
                          ) : (
                            <span className="mega-mobile-notice__text">{n.text}</span>
                          )}
                        </div>
                      ))}
                </div>
              )}
            </div>
            <div className="mega-mobile-hero__image">
              <Image
                src={teacher.imageUrl}
                alt={`${teacher.name} 선생님`}
                width={200}
                height={280}
                className="mega-mobile-hero__img"
                priority
              />
            </div>
          </div>
        </div>

        {/* 모바일: 탭 메뉴 제거 → 강의/교재를 바로 노출 (메인페이지 카드 UI 재사용) */}
        <div id="teacher-tabs" className="mega-mobile-content pb-16">
          {/* 강의/교재 */}
          {/* NOTE: StorePreviewTabs 내부에 이미 px-4 컨테이너가 있어, mega-mobile-section(16px)까지 감싸면 좌우 여백이 2배로 커짐 */}
          <div>
            <StorePreviewTabs
              courses={Array.isArray(teacher.storeCourses) ? teacher.storeCourses : []}
              textbooks={Array.isArray(teacher.storeTextbooks) ? teacher.storeTextbooks : []}
              variant="sections"
              sectionsMode="simple"
              hideTabMenus
              textbookGroupSections={textbookGroupSections}
            />
          </div>
        </div>
      </div>

      {/* ============ 데스크탑 전용 레이아웃 (기존) ============ */}
      <div className="unova-desktop-layout">
        <div className="unova-wrapper" ref={containerRef} style={themeVars}>
          {showCustomizer && (
            <div style={{ position: "sticky", top: 72, zIndex: 20, paddingTop: 10 }}>
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>페이지 커스터마이징</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>?customize=1</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    과목명
                    <input
                      value={subjectDraft}
                      onChange={(e) => setSubjectDraft(e.target.value)}
                      placeholder="예: 영어"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "#fff",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    뒤 배경색
                    <input
                      type="color"
                      value={(pageBgDraft && pageBgDraft.startsWith("#")) ? pageBgDraft : "#464065"}
                      onChange={(e) => setPageBgDraft(e.target.value)}
                      style={{ width: "100%", height: 40, background: "transparent", border: 0, padding: 0 }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    최근 소식
                    <input
                      type="color"
                      value={(newsBgDraft && newsBgDraft.startsWith("#")) ? newsBgDraft : "#2A263D"}
                      onChange={(e) => setNewsBgDraft(e.target.value)}
                      style={{ width: "100%", height: 40, background: "transparent", border: 0, padding: 0 }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.92 }}>
                    과목명 색상
                    <input
                      type="color"
                      value={(subjectColorDraft && subjectColorDraft.startsWith("#")) ? subjectColorDraft : "#957FF3"}
                      onChange={(e) => setSubjectColorDraft(e.target.value)}
                      style={{ width: "100%", height: 40, background: "transparent", border: 0, padding: 0 }}
                    />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    disabled={isSavingTheme}
                    onClick={async () => {
                      try {
                        setIsSavingTheme(true);
                        const res = await fetch("/api/admin/teachers/theme", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            slug: teacher.slug,
                            subjectName: subjectDraft.trim(),
                            pageBgColor: pageBgDraft || null,
                            newsBgColor: newsBgDraft || null,
                            subjectTextColor: subjectColorDraft || null,
                          }),
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok || !json?.ok) throw new Error("SAVE_FAILED");
                        alert("저장되었습니다. (새로고침 시에도 유지됩니다)");
                      } catch {
                        alert("저장에 실패했습니다.");
                      } finally {
                        setIsSavingTheme(false);
                      }
                    }}
                    style={{
                      padding: "10px 14px",
                      background: "#3b82f6",
                      border: 0,
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTheme}
                    onClick={() => {
                      setPageBgDraft("");
                      setNewsBgDraft("");
                      setSubjectColorDraft("");
                    }}
                    style={{
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    초기화
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="unova-container">
            {/* 중앙 콘텐츠 */}
            <div className="unova-content unova-content--no-sidebar">
              {/* 헤더 */}
              {teacher.headerSub ? (
                <div
                  className={`unova-header-sub ${isLsy ? "unova-header-sub--accent" : ""}`}
                  style={{
                    ...(isLsy ? { color: "#fff", fontWeight: 400 } : null),
                  }}
                >
                  {teacher.headerSub}
                </div>
              ) : null}
              <div className="unova-header-title">
                <span className="unova-subject">{subjectDraft || teacher.subject}</span> {teacher.name} 선생님
              </div>

              {/* 메뉴 */}
              {menu}

              {/* 커리큘럼 소개 유튜브 */}
              {showYoutube && embedSrc ? (
                <section
                  id="teacher-curriculum"
                  className="unova-youtube unova-youtube--below-menu unova-scroll-target"
                  aria-label="커리큘럼 소개 유튜브"
                >
                  <div className="unova-panel-title">커리큘럼 소개</div>
                  <div className="unova-youtube__frame">
                    <iframe
                      src={embedSrc}
                      title={`${teacher.name} 선생님 커리큘럼 소개`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </section>
              ) : null}
            </div>

            {/* 가운데 선생님 이미지 */}
            <div className="unova-teacher-area">
              {teacher.universityIconUrl ? (
                <div className="unova-university-badge" aria-hidden="true">
                  <div className="unova-university-badge__bubble">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={teacher.universityIconUrl}
                      alt=""
                      className="unova-university-badge__icon"
                    />
                    <span className="unova-university-badge__tail" />
                  </div>
                </div>
              ) : null}
              <Image
                src={teacher.imageUrl}
                alt={`${teacher.name} 선생님`}
                width={360}
                height={780}
                className="unova-teacher-img"
                priority
              />
            </div>

            {/* 오른쪽 패널 */}
            <aside className="unova-right-panel" aria-label="커리큘럼 소개 및 선생님 게시글">
              {/* PC: 게시글 카드 위 액션 바(요청사항: 게시글 아래로, 그 위에 하트/공유) */}
              <div className="hidden md:flex items-center justify-end gap-2" style={{ marginBottom: 10 }}>
                {shareToast ? (
                  <span className="text-[12px] px-2 py-1 rounded-md bg-white/10 whitespace-nowrap">
                    {shareToast}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={toggleTeacherLike}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 transition"
                  style={{
                    background: isTeacherLiked ? "rgba(244, 63, 94, 0.22)" : "rgba(255,255,255,0.06)",
                    borderColor: isTeacherLiked ? "rgba(244, 63, 94, 0.35)" : "rgba(255,255,255,0.10)",
                  }}
                  aria-label={isTeacherLiked ? "좋아요 취소" : "좋아요"}
                  title={isTeacherLiked ? "좋아요 취소" : "좋아요"}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "20px",
                      color: isTeacherLiked ? "rgb(244, 63, 94)" : "rgba(255,255,255,0.70)",
                      fontVariationSettings: isTeacherLiked
                        ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20"
                        : "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 20",
                    }}
                    aria-hidden="true"
                  >
                    favorite
                  </span>
                </button>

                <div className="relative" ref={shareMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsShareMenuOpen((v) => !v)}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-3 hover:bg-white/[0.10] transition"
                    aria-label="공유하기"
                    title="공유하기"
                    aria-expanded={isShareMenuOpen}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">
                      share
                    </span>
                    <span className="text-[12px] font-semibold text-white/80">공유</span>
                    <span className="material-symbols-outlined text-white/50" style={{ fontSize: "18px" }} aria-hidden="true">
                      expand_more
                    </span>
                  </button>

                  {isShareMenuOpen ? (
                    <div
                      className="absolute right-0 mt-2 w-[210px] rounded-xl border border-white/10 bg-[#1b1b22] shadow-lg overflow-hidden"
                      role="menu"
                      aria-label="공유 메뉴"
                    >
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full px-4 py-3 text-left text-[13px] text-white/85 hover:bg-white/[0.06] transition"
                        role="menuitem"
                      >
                        링크 복사
                      </button>
                      <button
                        type="button"
                        onClick={handleShareDevice}
                        className="w-full px-4 py-3 text-left text-[13px] text-white/85 hover:bg-white/[0.06] transition"
                        role="menuitem"
                      >
                        기기 공유(공유 시트)
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <section
                id="teacher-board"
                className="unova-news-card unova-scroll-target"
                aria-label="선생님 게시글"
                style={{ marginTop: 8 }}
              >
                <div className="unova-card-head">
                  <span className="unova-card-title">선생님 게시글</span>
                </div>

                {notices.length > 0 ? (
                  <ul className="unova-news-card__list">
                    {notices.slice(0, 5).map((n, idx) => (
                      <li key={idx} className="unova-news-card__item">
                        <div className="unova-news-card__body">
                          {typeof n.href === "string" && n.href.length > 0 ? (
                            <Link href={n.href} className="unova-news-card__text">
                              {n.text}
                            </Link>
                          ) : (
                            <span className="unova-news-card__text">{n.text}</span>
                          )}
                          {(n.authorName || n.createdAt) ? (
                            <div className="unova-news-card__meta">
                              {n.authorName ? <span className="unova-news-card__author">{formatTeacherLabel(n.authorName)}</span> : null}
                              {n.createdAt ? <span className="unova-news-card__time">{relTimeFromIso(n.createdAt)}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-5 pb-5 text-[13px] text-white/55">게시글이 없습니다.</div>
                )}
              </section>

              <section id="teacher-review" className="unova-rating-card unova-scroll-target" aria-label="실시간 리뷰">
                <div className="unova-card-head">
                  <span className="unova-card-title">실시간 리뷰</span>
                </div>

                {reviewCount > 0 ? (
                  <>
                    <div className="unova-rating-card__meta">
                      <div className="unova-rating-card__left">
                        <div className="unova-rating-card__stars" aria-label={`평점 ${avgRatingText}점 (5점 만점)`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < filledStars ? "is-on" : "is-off"} aria-hidden="true">★</span>
                          ))}
                        </div>
                        <div className="unova-rating-card__score">
                          {avgRatingText}
                          <small>/5</small>
                        </div>
                        <span className="unova-rating-card__count">총 리뷰 {reviewCount}개</span>
                      </div>
                    </div>
                    <ul className="unova-rating-card__list">
                      {reviews.slice(0, 3).map((r, idx) => (
                        <li key={idx} className="unova-rating-card__item">
                          <div className="unova-rating-card__item-head">
                            <span className="unova-rating-card__item-title">{stripLeadingScore(r.text)}</span>
                            <span className="unova-rating-card__item-score">
                              {Number(r.rating).toFixed(1)}
                              <span className="unova-rating-card__item-score-suffix">/5</span>
                            </span>
                          </div>
                          {(r.authorName || r.createdAt) ? (
                            <div className="unova-rating-card__item-sub">
                              <div className="unova-rating-card__meta-row">
                                {r.authorName ? <span className="unova-rating-card__author">{r.authorName}</span> : null}
                                {r.createdAt ? <span className="unova-rating-card__time">{relTimeFromIso(r.createdAt)}</span> : null}
                              </div>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="px-5 pb-5 text-[13px] text-white/55">아직 리뷰가 없습니다.</div>
                )}
              </section>
            </aside>
          </div>
        </div>

        {/* (모바일 강의/교재는 상단 mega-mobile-layout에서 메인페이지 카드 UI로 노출) */}
      </div>

      {/* PC: 선생님 이미지 아래(검정 섹션) - 강의/교재 고정 노출 */}
      <section id="teacher-tabs" className="hidden md:block bg-[#161616] unova-scroll-target pb-24">
        <StorePreviewTabs
          courses={Array.isArray(teacher.storeCourses) ? teacher.storeCourses : []}
          textbooks={Array.isArray(teacher.storeTextbooks) ? teacher.storeTextbooks : []}
          variant="sections"
          sectionsMode="simple"
          hideTabMenus
          anchorPrefix="teacher-pc"
          textbookGroupSections={textbookGroupSections}
        />
      </section>

      {/* 학력/약력 모달 */}
      {isModalOpen && (
        <div
          className={`unova-modal-overlay ${isModalOpen ? 'is-open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
          aria-hidden={!isModalOpen}
        >
          <div className="unova-modal" role="dialog" aria-modal="true" aria-labelledby="unova-profile-modal-title">
            <div className="unova-modal-header">
              <div className="unova-modal-title" id="unova-profile-modal-title">
                학력 / 약력
              </div>
              <button
                type="button"
                className="unova-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="팝업 닫기"
              >
                ×
              </button>
            </div>
            <div className="unova-modal-body">
              <div className="unova-modal-section">
                <div className="unova-modal-h">{teacher.profile.education.title}</div>
                <p className="unova-modal-p" style={{ whiteSpace: "pre-line" }}>
                  {teacher.profile.education.content}
                </p>
              </div>
              <div className="unova-modal-section">
                <div className="unova-modal-h">{teacher.profile.career.title}</div>
                <ul className="unova-modal-list">
                  {Array.isArray(teacher.profile.career.content) ? (
                    teacher.profile.career.content.map((item, idx) => <li key={idx}>{item}</li>)
                  ) : (
                    <li>{teacher.profile.career.content}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}


