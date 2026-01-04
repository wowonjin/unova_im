'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import Image from 'next/image';
import CurriculumCarousel, { CurriculumSlide } from './CurriculumCarousel';
import BookCoverFlow, { BookSet } from './BookCoverFlow';
import LectureRail, { LectureSet } from './LectureRail';
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
  promoImageUrl?: string;
  // 선생님 개인 페이지 커스터마이징(테마)
  pageBgColor?: string;
  menuBgColor?: string;
  newsBgColor?: string;
  ratingBgColor?: string;
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
  curriculumLink?: string;
  youtubeVideos?: YoutubeVideo[];
  faqItems?: FAQItem[];
  profile: {
    education: ProfileSection;
    career: ProfileSection;
    gradeImprovements?: ProfileSection;
    mockTestImprovements?: ProfileSection;
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
  const mobileTabsSentinelRef = useRef<HTMLDivElement | null>(null);
  const mobileTabsBarRef = useRef<HTMLDivElement | null>(null);
  const pcTabsSentinelRef = useRef<HTMLDivElement | null>(null);
  const pcTabsBarRef = useRef<HTMLDivElement | null>(null);
  const [isMobileTabsPinned, setIsMobileTabsPinned] = useState(false);
  const [isPcTabsPinned, setIsPcTabsPinned] = useState(false);
  const [mobileTabsBarHeight, setMobileTabsBarHeight] = useState(0);
  const [pcTabsBarHeight, setPcTabsBarHeight] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('intro');
  const [pcActiveTab, setPcActiveTab] = useState<MobileTab>('intro');
  const [lectureSubTab, setLectureSubTab] = useState<LectureSubTab>('single');
  const [isTeacherLiked, setIsTeacherLiked] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // 탭 메뉴: 헤더 아래에 고정(fixed)되도록 핀 처리 (sticky가 overflow/레이아웃에 의해 깨지는 케이스 방지)
  useEffect(() => {
    const getHeaderOffset = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--unova-fixed-header-offset").trim();
      const n = Number.parseFloat(raw.replace("px", ""));
      return Number.isFinite(n) ? n : 70;
    };

    const measure = () => {
      if (mobileTabsBarRef.current) setMobileTabsBarHeight(mobileTabsBarRef.current.getBoundingClientRect().height);
      if (pcTabsBarRef.current) setPcTabsBarHeight(pcTabsBarRef.current.getBoundingClientRect().height);
    };

    const onScroll = () => {
      const headerOffset = getHeaderOffset();
      const w = window.innerWidth;
      const isMobile = w <= 768;

      if (isMobile) {
        const top = mobileTabsSentinelRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
        setIsMobileTabsPinned(top <= headerOffset);
        setIsPcTabsPinned(false);
      } else {
        const top = pcTabsSentinelRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
        setIsPcTabsPinned(top <= headerOffset);
        setIsMobileTabsPinned(false);
      }
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLsy = teacher.slug === "lsy" || teacher.slug === "lee-sangyeob";

  // ===== 커스터마이징(개인 페이지에서 바로 설정) =====
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState<string>(teacher.subject || "");
  const [pageBgDraft, setPageBgDraft] = useState<string>(teacher.pageBgColor || "");
  const [menuBgDraft, setMenuBgDraft] = useState<string>(teacher.menuBgColor || "");
  const [newsBgDraft, setNewsBgDraft] = useState<string>(teacher.newsBgColor || "");
  const [ratingBgDraft, setRatingBgDraft] = useState<string>(teacher.ratingBgColor || "");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setShowCustomizer(sp.get("customize") === "1");
  }, []);

  const themeVars = {
    ["--u-page-bg" as any]: (pageBgDraft || teacher.pageBgColor || "") || undefined,
    ["--u-menu-bg" as any]: (menuBgDraft || teacher.menuBgColor || "") || undefined,
    ["--u-news-bg" as any]: (newsBgDraft || teacher.newsBgColor || "") || undefined,
    ["--u-rating-bg" as any]: (ratingBgDraft || teacher.ratingBgColor || "") || undefined,
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
          cache: "no-store",
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

    // 최초 1회 + 10초 폴링
    fetchRating();
    const id = window.setInterval(fetchRating, 10000);
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
  const hasPcBoard = notices.length > 0;
  // PC "새소식" 탭은 유튜브(커리큘럼 소개) 유무로 활성화
  const hasPcNews = Boolean(embedSrc);

  const handlePcTabClick = (tab: MobileTab) => {
    setPcActiveTab(tab);
    // "진짜 탭" 동작: 패널 전환 + 검정 섹션(탭 영역)으로 스크롤
    window.setTimeout(() => handleNavClick("#teacher-tabs"), 0);
  };

  // PC: 초기 해시가 있으면 탭 상태를 맞춤(하이라이트용)
  useEffect(() => {
    try {
      const hash = (typeof window !== "undefined" ? window.location.hash : "") || "";
      // 커리큘럼 탭 제거: 레거시 해시는 새소식 탭으로 매핑
      if (hash === "#teacher-curriculum") setPcActiveTab("news");
      else if (hash === "#teacher-lectures" || hash === "#teacher-books") setPcActiveTab("lecture");
      else if (hash === "#teacher-board") setPcActiveTab("board");
      else if (hash === "#teacher-review") setPcActiveTab("review");
      else if (hash === "#teacher-news") setPcActiveTab("news");
      else if (hash === "#teacher-tabs") {
        // 유지
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {teacher.navigationLinks.curriculum && (
          <div
            className="unova-menu-item"
            onClick={() => handleNavClick(teacher.navigationLinks.curriculum)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick(teacher.navigationLinks.curriculum);
              }
            }}
          >
            커리큘럼
          </div>
        )}
        {teacher.navigationLinks.lecture && (
          <div
            className="unova-menu-item"
            onClick={() => handleNavClick(teacher.navigationLinks.lecture)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick(teacher.navigationLinks.lecture);
              }
            }}
          >
            선생님 강좌<span className="unova-inline-n">N</span>
          </div>
        )}
        {teacher.navigationLinks.book && (
          <div
            className="unova-menu-item"
            onClick={() => handleNavClick(teacher.navigationLinks.book)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick(teacher.navigationLinks.book);
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
                    메뉴 배경(좌측)
                    <input
                      type="color"
                      value={(menuBgDraft && menuBgDraft.startsWith("#")) ? menuBgDraft : "#2f232b"}
                      onChange={(e) => setMenuBgDraft(e.target.value)}
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
                    총 강의 평점 컨테이너
                    <input
                      type="color"
                      value={(ratingBgDraft && ratingBgDraft.startsWith("#")) ? ratingBgDraft : "#2A263D"}
                      onChange={(e) => setRatingBgDraft(e.target.value)}
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
                            menuBgColor: menuBgDraft || null,
                            newsBgColor: newsBgDraft || null,
                            ratingBgColor: ratingBgDraft || null,
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
                      setMenuBgDraft("");
                      setNewsBgDraft("");
                      setRatingBgDraft("");
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
        <div className="mega-mobile-eventbar" role="note" aria-label="이벤트 안내">
          <span className="mega-mobile-eventbar__text">
            📌{teacher.name} 선생님 교재 및 강의 후기 이벤트를 확인하세요!
          </span>
        </div>

        {/* 히어로 섹션 */}
        <div className="mega-mobile-hero">
          <div className="mega-mobile-hero__bg" />
          <div className="mega-mobile-hero__content">
            <div className="mega-mobile-hero__info">
              {teacher.headerSub ? (
                <p className="mega-mobile-hero__catchphrase">{teacher.headerSub}</p>
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
                  <span className="mega-mobile-hero__review-count">리뷰 {reviewCount}개</span>
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
              {isLsy && (
                <div className="mega-mobile-hero__slogan" aria-hidden="true">
                  막연한 국어의 끝,
                  <br />
                  알고리즘 국어
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 메인 탭 메뉴 (메가스터디 스타일) - 스크롤 시 헤더 아래 고정 */}
        <div ref={mobileTabsSentinelRef} aria-hidden="true" />
        <div ref={mobileTabsBarRef} className={`mega-mobile-tabs-bar ${isMobileTabsPinned ? "is-fixed" : ""}`}>
          <nav className="mega-mobile-tabs" aria-label="선생님 정보 탭 메뉴">
            <div className="mega-mobile-tabs__scroll">
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'intro' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('intro')}
            >
              {TAB_LABEL.intro}
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'lecture' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('lecture')}
            >
              {TAB_LABEL.lecture}
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'board' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('board')}
            >
              {TAB_LABEL.board}
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'review' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              {TAB_LABEL.review}
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'news' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              {TAB_LABEL.news}
            </button>
            </div>
          </nav>
        </div>
        {isMobileTabsPinned ? <div style={{ height: mobileTabsBarHeight }} aria-hidden="true" /> : null}

        {/* 강좌 및 교재 탭 - 서브탭 */}
        {activeTab === 'lecture' && (
          <div className="mega-mobile-subtabs">
            <button
              type="button"
              className={`mega-mobile-subtab ${lectureSubTab === 'single' ? 'is-active' : ''}`}
              onClick={() => setLectureSubTab('single')}
            >
              {LECTURE_SUBTAB_LABEL.single}
            </button>
            <button
              type="button"
              className={`mega-mobile-subtab ${lectureSubTab === 'package' ? 'is-active' : ''}`}
              onClick={() => setLectureSubTab('package')}
            >
              {LECTURE_SUBTAB_LABEL.package}
            </button>
            <button
              type="button"
              className={`mega-mobile-subtab ${lectureSubTab === 'book' ? 'is-active' : ''}`}
              onClick={() => setLectureSubTab('book')}
            >
              {LECTURE_SUBTAB_LABEL.book}
            </button>
          </div>
        )}

        {/* 탭 콘텐츠 영역 */}
        <div className="mega-mobile-content">
          {/* 선생님 소개 탭 (상세페이지 이미지) */}
          {activeTab === 'intro' && (
            <div className="mega-mobile-section">
              {typeof teacher.promoImageUrl === "string" && teacher.promoImageUrl.trim() ? (
                <div className="mt-4 overflow-hidden rounded-xl bg-white/[0.02]">
                  <Image
                    src={teacher.promoImageUrl.trim()}
                    alt={`${teacher.name} 선생님 상세페이지 이미지`}
                    width={1200}
                    height={900}
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="py-10 text-center text-white/45 text-[13px]">소개가 준비중입니다.</div>
              )}
            </div>
          )}

          {/* 강좌 및 교재 탭 */}
          {activeTab === 'lecture' && (
            <div className="mega-mobile-section">
              {/* 단과강좌 */}
              {lectureSubTab === 'single' && teacher.lectureSets && (
                teacher.lectureSets.length > 0 ? (
                  <div className="mega-mobile-lecture-list">
                    {(singleLectures.length > 0 ? singleLectures : teacher.lectureSets).map((lectureSet) => (
                      <div key={lectureSet.id}>
                        {lectureSet.lectures.map((lecture, idx) => (
                          <div key={idx} className="mega-mobile-lecture-card">
                            <div className="mega-mobile-lecture-card__thumb">
                              <Image
                                src={lecture.thumbnail}
                                alt={lecture.title}
                                width={96}
                                height={54}
                                className="mega-mobile-lecture-card__img"
                              />
                            </div>
                            <div className="mega-mobile-lecture-card__content">
                              <h3 className="mega-mobile-lecture-card__title">{lecture.title}</h3>
                              <div className="mega-mobile-lecture-card__rating">
                                <span className="mega-mobile-lecture-card__stars">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={i < filledStars ? "is-on" : "is-off"}>★</span>
                                  ))}
                                </span>
                                <span className="mega-mobile-lecture-card__score">{avgRatingText}</span>
                                <span className="mega-mobile-lecture-card__review-count">({reviewCount})</span>
                              </div>
                            </div>
                            <a href={lecture.href} className="mega-mobile-lecture-card__link">강좌 보기</a>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mega-mobile-empty">단과 강좌가 없습니다.</div>
                )
              )}

              {/* 패키지강좌 */}
              {lectureSubTab === 'package' && (
                <div className="mega-mobile-lecture-list">
                  {packageLectures.length > 0 ? (
                    packageLectures.map((lectureSet) => (
                      <div key={lectureSet.id}>
                        {lectureSet.lectures.map((lecture, idx) => (
                          <div key={idx} className="mega-mobile-lecture-card">
                            <div className="mega-mobile-lecture-card__thumb">
                              <Image
                                src={lecture.thumbnail}
                                alt={lecture.title}
                                width={96}
                                height={54}
                                className="mega-mobile-lecture-card__img"
                              />
                            </div>
                            <div className="mega-mobile-lecture-card__content">
                              <h3 className="mega-mobile-lecture-card__title">{lecture.title}</h3>
                              <div className="mega-mobile-lecture-card__rating">
                                <span className="mega-mobile-lecture-card__stars">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={i < filledStars ? "is-on" : "is-off"}>★</span>
                                  ))}
                                </span>
                                <span className="mega-mobile-lecture-card__score">{avgRatingText}</span>
                                <span className="mega-mobile-lecture-card__review-count">({reviewCount})</span>
                              </div>
                            </div>
                            <a href={lecture.href} className="mega-mobile-lecture-card__link">강좌 보기</a>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="mega-mobile-empty">패키지 강좌가 없습니다.</div>
                  )}
                </div>
              )}

              {/* 교재 */}
              {lectureSubTab === 'book' && teacher.bookSets && (
                teacher.bookSets.length > 0 ? (
                  <div className="mega-mobile-book-list">
                    {teacher.bookSets.map((bookSet) => (
                      <div key={bookSet.id}>
                        {bookSet.books.map((book, idx) => (
                          <a key={idx} href={book.href} className="mega-mobile-book-card">
                            <div className="mega-mobile-book-card__image">
                              <Image
                                src={book.cover}
                                alt={book.title}
                                width={80}
                                height={110}
                                className="mega-mobile-book-card__img"
                              />
                            </div>
                            <div className="mega-mobile-book-card__info">
                              <h3 className="mega-mobile-book-card__title">{book.title}</h3>
                              <span className="mega-mobile-book-card__sub">{book.sub}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mega-mobile-empty">교재가 없습니다.</div>
                )
              )}
            </div>
          )}

          {/* 게시판 탭 */}
          {activeTab === 'board' && (
            <div className="mega-mobile-section">
              {notices.length > 0 ? (
                <div className="mega-mobile-board-list">
                  {notices.map((n, idx) => (
                    <div key={idx} className="mega-mobile-board-item">
                      {/* 모바일 게시판 탭: '공지' 태그는 숨김 */}
                      {n.tag !== 'notice' ? (
                        <span className="mega-mobile-board-item__tag">
                          {n.tag === 'event' ? '이벤트' : '교재'}
                        </span>
                      ) : null}
                      {typeof n.href === "string" && n.href.length > 0 ? (
                        <Link href={n.href} className="mega-mobile-board-item__title">
                          {n.text}
                        </Link>
                      ) : (
                        <span className="mega-mobile-board-item__title">{n.text}</span>
                      )}
                      {n.createdAt && (
                        <span className="mega-mobile-board-item__date">{relTimeFromIso(n.createdAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mega-mobile-empty">게시글이 없습니다.</div>
              )}
            </div>
          )}

          {/* Q&A 탭 */}
          {/* 실시간 리뷰 탭 */}
          {activeTab === 'review' && (
            <div className="mega-mobile-section">
              {/* 평점 요약 (PC 실시간 리뷰 카드와 동일한 집계값 사용) */}
              {reviewCount > 0 ? (
                <div className="mega-mobile-rating-summary">
                  <div className="mega-mobile-rating-summary__stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < filledStars ? "is-on" : "is-off"}>★</span>
                    ))}
                  </div>
                  <span className="mega-mobile-rating-summary__score">{avgRatingText}</span>
                  <span className="mega-mobile-rating-summary__count">({reviewCount})</span>
                </div>
              ) : (
                <div className="py-10 text-center text-white/45 text-[13px]">아직 리뷰가 없습니다.</div>
              )}

              {/* 최근 후기 리스트 */}
              {reviews.length > 0 ? (
                <div className="mega-mobile-review-list">
                  <h3 className="mega-mobile-review-list__title">최근 리뷰</h3>
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((r, idx) => {
                      const author = maskAuthorName(r.authorName);
                      const initial = (author || "U").trim()[0] || "U";
                      return (
                        <div key={idx} className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center shrink-0">
                              <span className="text-[14px] font-medium text-white/80">{initial}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-medium text-white/90">{author || "익명"}</span>
                                {renderStars(Number(r.rating), "text-[12px]")}
                              </div>
                              {r.createdAt ? (
                                <p className="text-[12px] text-white/40 mt-0.5">{relTimeFromIso(r.createdAt)}</p>
                              ) : null}
                            </div>
                          </div>
                          <p className="text-[14px] text-white/70 leading-relaxed">
                            {stripLeadingScore(r.text)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* 새소식 탭 */}
          {activeTab === 'news' && (
            <div className="mega-mobile-section">
              {teacher.curriculum && teacher.curriculum.length > 0 ? (
                <CurriculumCarousel slides={teacher.curriculum} />
              ) : embedSrc ? (
                <div className="mega-mobile-video">
                  <iframe
                    src={embedSrc}
                    title={`${teacher.name} 선생님 커리큘럼 소개`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="py-10 text-center text-white/45 text-[13px]">새소식이 없습니다.</div>
              )}
            </div>
          )}
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
                    메뉴 배경
                    <input
                      type="color"
                      value={(menuBgDraft && menuBgDraft.startsWith("#")) ? menuBgDraft : "#2f232b"}
                      onChange={(e) => setMenuBgDraft(e.target.value)}
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
                    총 강의 평점
                    <input
                      type="color"
                      value={(ratingBgDraft && ratingBgDraft.startsWith("#")) ? ratingBgDraft : "#2A263D"}
                      onChange={(e) => setRatingBgDraft(e.target.value)}
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
                            menuBgColor: menuBgDraft || null,
                            newsBgColor: newsBgDraft || null,
                            ratingBgColor: ratingBgDraft || null,
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
                      setMenuBgDraft("");
                      setNewsBgDraft("");
                      setRatingBgDraft("");
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
                  style={isLsy ? { color: "#fff", fontWeight: 400 } : undefined}
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
              {embedSrc ? (
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

              {/* PC: 관리자에서 선택한 강좌/교재 노출 (더미 데이터 제거) */}
              {Array.isArray(teacher.lectureSets) && teacher.lectureSets.length > 0 ? (
                <section id="teacher-lectures" className="mt-8 unova-scroll-target" aria-label="선생님 강좌">
                  <div className="unova-panel-title">선생님 강좌</div>
                  <div className="grid gap-3">
                    {teacher.lectureSets.map((set) => (
                      <div key={set.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                        <div className="text-[13px] font-semibold text-white/80 mb-3">{set.label}</div>
                        <div className="grid gap-2">
                          {set.lectures.map((lec, idx) => (
                            <Link
                              key={`${set.id}-${idx}`}
                              href={lec.href}
                              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                            >
                              <Image
                                src={lec.thumbnail}
                                alt={lec.title}
                                width={64}
                                height={40}
                                className="h-10 w-16 rounded-md object-cover bg-white/5"
                                sizes="64px"
                                loading="lazy"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-white/90 truncate">{lec.title}</div>
                                <div className="text-[12px] text-white/40">상품 보기</div>
                              </div>
                              <span className="material-symbols-outlined text-white/50" style={{ fontSize: "18px" }} aria-hidden="true">
                                chevron_right
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {Array.isArray(teacher.bookSets) && teacher.bookSets.length > 0 ? (
                <section id="teacher-books" className="mt-8 unova-scroll-target" aria-label="선생님 교재">
                  <div className="unova-panel-title">선생님 교재</div>
                  <div className="grid gap-3">
                    {teacher.bookSets.map((set) => (
                      <div key={set.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                        <div className="text-[13px] font-semibold text-white/80 mb-3">{set.label}</div>
                        <div className="grid gap-2">
                          {set.books.map((b, idx) => (
                            <Link
                              key={`${set.id}-${idx}`}
                              href={b.href}
                              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                            >
                              <Image
                                src={b.cover}
                                alt={b.title}
                                width={40}
                                height={48}
                                className="h-12 w-10 rounded-md object-cover bg-white/5"
                                sizes="40px"
                                loading="lazy"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-white/90 truncate">{b.title}</div>
                                <div className="text-[12px] text-white/40 truncate">{b.sub}</div>
                              </div>
                              <span className="material-symbols-outlined text-white/50" style={{ fontSize: "18px" }} aria-hidden="true">
                                chevron_right
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            {/* 가운데 선생님 이미지 */}
            <div className="unova-teacher-area">
              <Image
                src={teacher.imageUrl}
                alt={`${teacher.name} 선생님`}
                width={360}
                height={780}
                className="unova-teacher-img"
                priority
              />

              {typeof effectiveSubject === "string" && effectiveSubject.includes("국어") ? (
                <div className="unova-teacher-slogan" aria-label="선생님 슬로건">
                  <div className="unova-teacher-slogan__line1">막연한 국어의 끝,</div>
                  <div className="unova-teacher-slogan__line2">알고리즘 국어</div>
                </div>
              ) : null}
            </div>

            {/* 오른쪽 패널 */}
            <aside className="unova-right-panel" aria-label="커리큘럼 소개 및 선생님 게시글">
              {notices.length > 0 ? (
                <>
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
                  </section>
                </>
              ) : null}

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

        {/* PC에서는 아래 섹션 제거 (모바일만 유지) */}
        <div className="md:hidden">
          {/* 커리큘럼 캐러셀 */}
          {teacher.curriculum && teacher.curriculum.length > 0 && (
            <CurriculumCarousel slides={teacher.curriculum} />
          )}

          {/* 교재 구매하기 섹션 */}
          {teacher.bookSets && teacher.bookSets.length > 0 && (
            <BookCoverFlow
              title="교재 구매하기."
              bookSets={teacher.bookSets}
              defaultTab={teacher.bookSets[0].id}
            />
          )}

          {/* 강의 구매하기 섹션 */}
          {teacher.lectureSets && teacher.lectureSets.length > 0 && (
            <LectureRail
              title="강의 구매하기."
              lectureSets={teacher.lectureSets}
              defaultTab={teacher.lectureSets[0].id}
              curriculumLink={teacher.curriculumLink}
            />
          )}
        </div>
      </div>

      {/* PC: 선생님 이미지 아래(검정 섹션) - 탭 메뉴 + 새소식(상세 이미지) */}
      <section id="teacher-tabs" className="hidden md:block bg-[#161616] unova-scroll-target">
        {/* PC 탭 바: 스크롤 시 헤더 아래 고정 */}
        <div ref={pcTabsSentinelRef} aria-hidden="true" />
        <div ref={pcTabsBarRef} className={`unova-tabs-bar ${isPcTabsPinned ? "is-fixed" : ""}`}>
          <div className="mx-auto max-w-6xl px-4">
            {/* PC 탭 메뉴: 실제 tablist/tab/tabpanel 구조 */}
            <nav className="unova-desktop-tabs unova-desktop-tabs--black" aria-label="선생님 정보 탭 메뉴 (PC)" role="tablist">
              <div className="unova-desktop-tabs__scroll">
              <button
                id="pc-tab-intro"
                role="tab"
                type="button"
                aria-selected={pcActiveTab === "intro"}
                aria-controls="pc-tabpanel-intro"
                className={`unova-desktop-tab ${pcActiveTab === "intro" ? "is-active" : ""}`}
                onClick={() => handlePcTabClick("intro")}
              >
                {TAB_LABEL.intro}
              </button>

              <button
                id="pc-tab-lecture"
                role="tab"
                type="button"
                aria-selected={pcActiveTab === "lecture"}
                aria-controls="pc-tabpanel-lecture"
                className={`unova-desktop-tab ${pcActiveTab === "lecture" ? "is-active" : ""}`}
                onClick={() => handlePcTabClick("lecture")}
              >
                {TAB_LABEL.lecture}
              </button>

              <button
                id="pc-tab-board"
                role="tab"
                type="button"
                aria-selected={pcActiveTab === "board"}
                aria-controls="pc-tabpanel-board"
                className={`unova-desktop-tab ${pcActiveTab === "board" ? "is-active" : ""} ${hasPcBoard ? "" : "is-disabled"}`}
                onClick={() => hasPcBoard && handlePcTabClick("board")}
                disabled={!hasPcBoard}
              >
                {TAB_LABEL.board}
              </button>

              <button
                id="pc-tab-review"
                role="tab"
                type="button"
                aria-selected={pcActiveTab === "review"}
                aria-controls="pc-tabpanel-review"
                className={`unova-desktop-tab ${pcActiveTab === "review" ? "is-active" : ""}`}
                onClick={() => handlePcTabClick("review")}
              >
                {TAB_LABEL.review}
              </button>

              <button
                id="pc-tab-news"
                role="tab"
                type="button"
                aria-selected={pcActiveTab === "news"}
                aria-controls="pc-tabpanel-news"
                className={`unova-desktop-tab ${pcActiveTab === "news" ? "is-active" : ""} ${hasPcNews ? "" : "is-disabled"}`}
                onClick={() => hasPcNews && handlePcTabClick("news")}
                disabled={!hasPcNews}
              >
                {TAB_LABEL.news}
              </button>
              </div>
            </nav>
          </div>
        </div>
        {isPcTabsPinned ? <div style={{ height: pcTabsBarHeight }} aria-hidden="true" /> : null}

        <div className="mx-auto max-w-6xl px-4">
          <div className="unova-desktop-tabpanels">
            {/* 선생님 소개(상세 이미지) 패널 */}
            {pcActiveTab === "intro" ? (
              <div
                id="pc-tabpanel-intro"
                role="tabpanel"
                aria-labelledby="pc-tab-intro"
                className="unova-desktop-tabpanel"
              >
                {typeof teacher.promoImageUrl === "string" && teacher.promoImageUrl.trim() ? (
                  <div className="py-10">
                    <div className="unova-promo-image overflow-hidden bg-white/[0.02]">
                      <Image
                        src={teacher.promoImageUrl.trim()}
                        alt={`${teacher.name} 선생님 상세페이지 이미지`}
                        width={1600}
                        height={1200}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="unova-desktop-panel-empty">소개가 준비중입니다.</div>
                )}
              </div>
            ) : null}

            {/* 강좌/교재 패널 */}
            {pcActiveTab === "lecture" ? (
              <div
                id="pc-tabpanel-lecture"
                role="tabpanel"
                aria-labelledby="pc-tab-lecture"
                className="unova-desktop-tabpanel"
              >
                <div className="unova-desktop-panel--flat">
                  {/* PC에서도 모바일처럼: 강좌/교재 하위 탭 메뉴 */}
                  <div className="border-b border-white/10">
                    <div className="flex items-center gap-8 px-1">
                      <button
                        type="button"
                        onClick={() => setLectureSubTab("single")}
                        className={`relative py-4 text-base ${
                          lectureSubTab === "single" ? "font-semibold text-white" : "text-white/70 hover:text-white"
                        }`}
                      >
                        {LECTURE_SUBTAB_LABEL.single}
                        {lectureSubTab === "single" ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white" /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLectureSubTab("package")}
                        className={`relative py-4 text-base ${
                          lectureSubTab === "package"
                            ? "font-semibold text-white"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        {LECTURE_SUBTAB_LABEL.package}
                        {lectureSubTab === "package" ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white" /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLectureSubTab("book")}
                        className={`relative py-4 text-base ${
                          lectureSubTab === "book"
                            ? "font-semibold text-white"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        {LECTURE_SUBTAB_LABEL.book}
                        {lectureSubTab === "book" ? <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-white" /> : null}
                      </button>
                    </div>
                  </div>

                  {/* 콘텐츠 */}
                  {lectureSubTab === "book" ? (
                    (teacher.bookSets?.length ?? 0) > 0 ? (
                      <section className="mt-6" aria-label="선생님 교재">
                        <div className="unova-panel-title">선생님 교재</div>
                        <div className="grid gap-3">
                          {(teacher.bookSets || []).map((set) => (
                            <div key={set.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                              <div className="text-[13px] font-semibold text-white/80 mb-3">{set.label}</div>
                              <div className="grid gap-2">
                                {set.books.map((b, idx) => (
                                  <Link
                                    key={`${set.id}-${idx}`}
                                    href={b.href}
                                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                                  >
                                    <Image
                                      src={b.cover}
                                      alt={b.title}
                                      width={40}
                                      height={48}
                                      className="h-12 w-10 rounded-md object-cover bg-white/5"
                                      sizes="40px"
                                      loading="lazy"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[13px] font-medium text-white/90 truncate">{b.title}</div>
                                      <div className="text-[12px] text-white/40 truncate">{b.sub}</div>
                                    </div>
                                    <span className="material-symbols-outlined text-white/50" style={{ fontSize: "18px" }} aria-hidden="true">
                                      chevron_right
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : (
                      <div className="unova-desktop-panel-empty">교재가 없습니다.</div>
                    )
                  ) : (
                    <>
                      {(lectureSubTab === "package" ? packageLectures : singleLectures).length > 0 ? (
                        <section className="mt-6" aria-label="선생님 강좌">
                          <div className="unova-panel-title">선생님 강좌</div>
                          <div className="grid gap-3">
                            {(lectureSubTab === "package" ? packageLectures : singleLectures).map((set) => (
                              <div key={set.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                                <div className="text-[13px] font-semibold text-white/80 mb-3">{set.label}</div>
                                <div className="grid gap-2">
                                  {set.lectures.map((lec, idx) => (
                                    <Link
                                      key={`${set.id}-${idx}`}
                                      href={lec.href}
                                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                                    >
                                      <Image
                                        src={lec.thumbnail}
                                        alt={lec.title}
                                        width={64}
                                        height={40}
                                        className="h-10 w-16 rounded-md object-cover bg-white/5"
                                        sizes="64px"
                                        loading="lazy"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-medium text-white/90 truncate">{lec.title}</div>
                                        <div className="text-[12px] text-white/40">상품 보기</div>
                                      </div>
                                      <span className="material-symbols-outlined text-white/50" style={{ fontSize: "18px" }} aria-hidden="true">
                                        chevron_right
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : (
                        <div className="unova-desktop-panel-empty">
                          {lectureSubTab === "package" ? "패키지 강좌가 없습니다." : "강좌가 없습니다."}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {/* 게시판 패널 */}
            {pcActiveTab === "board" ? (
              <div
                id="pc-tabpanel-board"
                role="tabpanel"
                aria-labelledby="pc-tab-board"
                className="unova-desktop-tabpanel"
              >
                {notices.length > 0 ? (
                  <section className="unova-news-card--flat" aria-label="선생님 게시글">
                    <div className="unova-card-head">
                      <span className="unova-card-title">선생님 게시글</span>
                    </div>
                    <ul className="unova-news-card__list">
                      {notices.slice(0, 10).map((n, idx) => (
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
                  </section>
                ) : (
                  <div className="unova-desktop-panel-empty">게시글이 없습니다.</div>
                )}
              </div>
            ) : null}

            {/* 리뷰 패널 */}
            {pcActiveTab === "review" ? (
              <div
                id="pc-tabpanel-review"
                role="tabpanel"
                aria-labelledby="pc-tab-review"
                className="unova-desktop-tabpanel"
              >
                <section className="unova-rating-card--flat" aria-label="실시간 리뷰">
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
                        {reviews.slice(0, 10).map((r, idx) => (
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
              </div>
            ) : null}

            {/* 새소식(상세 이미지) 패널 */}
            {pcActiveTab === "news" ? (
              <div
                id="pc-tabpanel-news"
                role="tabpanel"
                aria-labelledby="pc-tab-news"
                className="unova-desktop-tabpanel"
              >
                {embedSrc ? (
                  <div className="unova-desktop-panel">
                    <div className="unova-panel-title">커리큘럼 소개</div>
                    <div className="unova-youtube__frame">
                      <iframe
                        src={embedSrc}
                        title={`${teacher.name} 선생님 커리큘럼 소개`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="unova-desktop-panel-empty">새소식이 없습니다.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
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
              {teacher.profile.gradeImprovements && (
                <div className="unova-modal-section">
                  <div className="unova-modal-h">{teacher.profile.gradeImprovements.title}</div>
                  <ul className="unova-modal-list">
                    {Array.isArray(teacher.profile.gradeImprovements.content) ? (
                      teacher.profile.gradeImprovements.content.map((item, idx) => <li key={idx}>{item}</li>)
                    ) : (
                      <li>{teacher.profile.gradeImprovements.content}</li>
                    )}
                  </ul>
                </div>
              )}
              {teacher.profile.mockTestImprovements && (
                <div className="unova-modal-section">
                  <div className="unova-modal-h">{teacher.profile.mockTestImprovements.title}</div>
                  <ul className="unova-modal-list">
                    {Array.isArray(teacher.profile.mockTestImprovements.content) ? (
                      teacher.profile.mockTestImprovements.content.map((item, idx) => <li key={idx}>{item}</li>)
                    ) : (
                      <li>{teacher.profile.mockTestImprovements.content}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}


