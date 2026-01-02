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
type MobileTab = 'curriculum' | 'lecture' | 'board' | 'qna' | 'news';
type LectureSubTab = 'single' | 'package' | 'book';

export default function TeacherDetailClient({ teacher }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('lecture');
  const [lectureSubTab, setLectureSubTab] = useState<LectureSubTab>('single');
  const containerRef = useRef<HTMLDivElement>(null);
  const isLsy = teacher.slug === "lsy" || teacher.slug === "lee-sangyeob";

  const [liveSummary, setLiveSummary] = useState<{ reviewCount: number; avgRating: number } | null>(
    teacher.ratingSummary && typeof teacher.ratingSummary.reviewCount === "number" && typeof teacher.ratingSummary.avgRating === "number"
      ? teacher.ratingSummary
      : null
  );
  const [liveRecentReviews, setLiveRecentReviews] = useState<Review[]>(
    Array.isArray(teacher.reviews) ? teacher.reviews : []
  );

  const reviews = liveRecentReviews;
  const baseSummary =
    teacher.ratingSummary && typeof teacher.ratingSummary.reviewCount === "number" && typeof teacher.ratingSummary.avgRating === "number"
      ? teacher.ratingSummary
      : null;
  const effectiveSummary = liveSummary ?? baseSummary;

  const reviewCount = effectiveSummary?.reviewCount ?? reviews.length;
  const avgRating =
    effectiveSummary?.avgRating ??
    (reviews.length > 0 ? reviews.reduce((sum, r) => sum + (typeof r.rating === "number" ? r.rating : 0), 0) / reviews.length : 0);
  const avgRatingText = reviewCount > 0 ? avgRating.toFixed(1) : "0.0";
  const filledStars = Math.max(0, Math.min(5, Math.round(avgRating)));
  const notices = Array.isArray(teacher.notices) ? teacher.notices : [];
  const youtubeVideos = Array.isArray(teacher.youtubeVideos) ? teacher.youtubeVideos : [];

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
            <span className="hidden md:inline">선생님 게시판</span>
            <span className="md:hidden">게시판</span>
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
      <div className="mega-mobile-layout">
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
              <p className="mega-mobile-hero__catchphrase">{teacher.headerSub}</p>
              <h1 className="mega-mobile-hero__name">
                <span className="mega-mobile-hero__subject">{teacher.subject}</span> {teacher.name} 선생님
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

        {/* 메인 탭 메뉴 (메가스터디 스타일) */}
        <nav className="mega-mobile-tabs" aria-label="선생님 정보 탭 메뉴">
          <div className="mega-mobile-tabs__scroll">
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'curriculum' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('curriculum')}
            >
              커리큘럼
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'lecture' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('lecture')}
            >
              강좌 및 교재
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'board' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('board')}
            >
              게시판
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'qna' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('qna')}
            >
              Q&A
            </button>
            <button
              type="button"
              className={`mega-mobile-tab ${activeTab === 'news' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              새소식
            </button>
          </div>
        </nav>

        {/* 강좌 및 교재 탭 - 서브탭 */}
        {activeTab === 'lecture' && (
          <div className="mega-mobile-subtabs">
            <button
              type="button"
              className={`mega-mobile-subtab ${lectureSubTab === 'single' ? 'is-active' : ''}`}
              onClick={() => setLectureSubTab('single')}
            >
              단과강좌
            </button>
            <button
              type="button"
              className={`mega-mobile-subtab ${lectureSubTab === 'package' ? 'is-active' : ''}`}
              onClick={() => setLectureSubTab('package')}
            >
              패키지강좌
            </button>
            <button
              type="button"
              className={`mega-mobile-subtab ${lectureSubTab === 'book' ? 'is-active' : ''}`}
              onClick={() => setLectureSubTab('book')}
            >
              교재
            </button>
          </div>
        )}

        {/* 탭 콘텐츠 영역 */}
        <div className="mega-mobile-content">
          {/* 커리큘럼 탭 */}
          {activeTab === 'curriculum' && (
            <div className="mega-mobile-section">
              {embedSrc && (
                <div className="mega-mobile-video">
                  <iframe
                    src={embedSrc}
                    title={`${teacher.name} 선생님 커리큘럼 소개`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
              {teacher.curriculum && teacher.curriculum.length > 0 && (
                <div className="mega-mobile-curriculum-list">
                  {teacher.curriculum.map((item, idx) => (
                    <div key={idx} className="mega-mobile-curriculum-card">
                      <div className="mega-mobile-curriculum-card__header">
                        <span className="mega-mobile-curriculum-card__step">STEP {idx + 1}</span>
                        <span className="mega-mobile-curriculum-card__title">{item.title}</span>
                      </div>
                      {item.sub && (
                        <p className="mega-mobile-curriculum-card__desc">{item.sub}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 강좌 및 교재 탭 */}
          {activeTab === 'lecture' && (
            <div className="mega-mobile-section">
              {/* 단과강좌 */}
              {lectureSubTab === 'single' && teacher.lectureSets && (
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
                      <span className="mega-mobile-board-item__tag">
                        {n.tag === 'notice' ? '공지' : n.tag === 'event' ? '이벤트' : '교재'}
                      </span>
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
          {activeTab === 'qna' && (
            <div className="mega-mobile-section">
              {teacher.faqItems && teacher.faqItems.length > 0 ? (
                <div className="mega-mobile-qna-list">
                  {teacher.faqItems.map((faq, idx) => (
                    <div key={idx} className="mega-mobile-qna-item">
                      <div className="mega-mobile-qna-item__q">
                        <span className="mega-mobile-qna-item__icon">Q</span>
                        <span className="mega-mobile-qna-item__text">{faq.question}</span>
                      </div>
                      <div className="mega-mobile-qna-item__a">
                        <span className="mega-mobile-qna-item__icon mega-mobile-qna-item__icon--a">A</span>
                        <span className="mega-mobile-qna-item__text">{faq.answer}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mega-mobile-empty">Q&A가 없습니다.</div>
              )}
            </div>
          )}

          {/* 새소식 탭 */}
          {activeTab === 'news' && (
            <div className="mega-mobile-section">
              {/* 평점 요약 */}
              {reviewCount > 0 && (
                <div className="mega-mobile-rating-summary">
                  <div className="mega-mobile-rating-summary__stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < filledStars ? "is-on" : "is-off"}>★</span>
                    ))}
                  </div>
                  <span className="mega-mobile-rating-summary__score">{avgRatingText}</span>
                  <span className="mega-mobile-rating-summary__count">({reviewCount})</span>
                </div>
              )}

              {/* 최근 후기 */}
              {reviews.length > 0 && (
                <div className="mega-mobile-review-list">
                  <h3 className="mega-mobile-review-list__title">최근 수강후기</h3>
                  {reviews.slice(0, 5).map((r, idx) => (
                    <div key={idx} className="mega-mobile-review-item">
                      <div className="mega-mobile-review-item__header">
                        <span className="mega-mobile-review-item__rating">{Number(r.rating).toFixed(1)}점</span>
                        {r.authorName && <span className="mega-mobile-review-item__author">{r.authorName}</span>}
                        {r.createdAt && <span className="mega-mobile-review-item__date">{relTimeFromIso(r.createdAt)}</span>}
                      </div>
                      <p className="mega-mobile-review-item__text">{stripLeadingScore(r.text)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============ 데스크탑 전용 레이아웃 (기존) ============ */}
      <div className="unova-desktop-layout">
        <div className="unova-wrapper" ref={containerRef}>
          <div className="unova-container">
            {/* 중앙 콘텐츠 */}
            <div className="unova-content unova-content--no-sidebar">
              {/* 헤더 */}
              <div
                className={`unova-header-sub ${isLsy ? "unova-header-sub--accent" : ""}`}
                style={isLsy ? { color: "#fff", fontWeight: 400 } : undefined}
              >
                {teacher.headerSub}
              </div>
              <div className="unova-header-title">
                <span className="unova-subject">{teacher.subject}</span> {teacher.name} 선생님
              </div>

              {/* 메뉴 */}
              {menu}

              {/* 커리큘럼 소개 유튜브 */}
              {embedSrc ? (
                <section className="unova-youtube unova-youtube--below-menu" aria-label="커리큘럼 소개 유튜브">
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
              <Image
                src={teacher.imageUrl}
                alt={`${teacher.name} 선생님`}
                width={360}
                height={780}
                className="unova-teacher-img"
                priority
              />

              {typeof teacher.subject === "string" && teacher.subject.includes("국어") ? (
                <div className="unova-teacher-slogan" aria-label="선생님 슬로건">
                  <div className="unova-teacher-slogan__line1">막연한 국어의 끝,</div>
                  <div className="unova-teacher-slogan__line2">알고리즘 국어</div>
                </div>
              ) : null}
            </div>

            {/* 오른쪽 패널 */}
            <aside className="unova-right-panel" aria-label="커리큘럼 소개 및 최근 소식">
              {notices.length > 0 ? (
                <section className="unova-news-card" aria-label="최근 소식">
                  <div className="unova-card-head">
                    <span className="unova-card-title">최근 소식</span>
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
              ) : null}

              {reviewCount > 0 && (
                <section className="unova-rating-card" aria-label="강의 평점 및 수강 후기">
                  <div className="unova-card-head">
                    <span className="unova-card-title">총 강의 평점</span>
                  </div>
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
                </section>
              )}
            </aside>
          </div>
        </div>

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


