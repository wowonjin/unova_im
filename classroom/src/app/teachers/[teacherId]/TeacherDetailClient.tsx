'use client';

import { useState, useEffect, useRef } from 'react';
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
};

type Notice = {
  tag: 'book' | 'event' | 'notice';
  text: string;
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
  name: string;
  subject: string;
  subjectColor: string;
  bgColor: string;
  headerSub: string;
  imageUrl: string;
  promoImageUrl?: string;
  banners: Banner[];
  reviews: Review[];
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

export default function TeacherDetailClient({ teacher }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const reviews = Array.isArray(teacher.reviews) ? teacher.reviews : [];
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + (typeof r.rating === "number" ? r.rating : 0), 0) / reviewCount : 0;
  const avgRatingText = reviewCount > 0 ? avgRating.toFixed(1) : "0.0";
  const filledStars = Math.max(0, Math.min(5, Math.round(avgRating)));
  const notices = Array.isArray(teacher.notices) ? teacher.notices : [];
  const youtubeVideos = Array.isArray(teacher.youtubeVideos) ? teacher.youtubeVideos : [];

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
            선생님 게시판<span className="unova-inline-n">N</span>
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

  return (
    <>
      <div className="unova-wrapper" ref={containerRef}>
        <div className="unova-container">
          {/* 중앙 콘텐츠 */}
          <div className="unova-content unova-content--no-sidebar">
            {/* 헤더 */}
            <div className="unova-header-sub">{teacher.headerSub}</div>
            <div className="unova-header-title">
              <span className="unova-subject">{teacher.subject}</span> {teacher.name} 선생님
            </div>

            {/* 메뉴: '과목 선생님 이름' 아래로 이동 */}
            {menu}

            {/* 총 평점 + 후기 */}
            {reviewCount > 0 && (
              <section className="unova-rating" aria-label="강의 평점 및 수강 후기">
                <div className="unova-rating__top">
                  <div className="unova-rating__title">총 강의 평점</div>
                  <div className="unova-rating__score">
                    <span className="unova-rating__num">{avgRatingText}</span>
                    <span className="unova-rating__max">/5</span>
                  </div>
                </div>

                <div className="unova-rating__stars" aria-label={`평점 ${avgRatingText}점 (5점 만점)`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < filledStars ? "is-on" : "is-off"} aria-hidden="true">
                      ★
                    </span>
                  ))}
                  <span className="unova-rating__count">후기 {reviewCount}개</span>
                </div>

                <ul className="unova-rating__list">
                  {reviews.slice(0, 4).map((r, idx) => (
                    <li key={idx} className="unova-rating__item">
                      <p className="unova-rating__text">{r.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
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
          </div>

          {/* 오른쪽: 커리큘럼 소개 유튜브 + 최근 소식 */}
          <aside className="unova-right-panel" aria-label="커리큘럼 소개 및 최근 소식">
            {embedSrc ? (
              <section className="unova-youtube">
                <div className="unova-panel-title">커리큘럼 소개</div>
                <div className="unova-youtube__frame">
                  <iframe
                    src={embedSrc}
                    title={`${teacher.name} 선생님 커리큘럼 소개`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                {youtubeVideos.length > 1 && (
                  <div className="unova-youtube__more">
                    {youtubeVideos.slice(1, 4).map((v, idx) => (
                      <a
                        key={idx}
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="unova-youtube__link"
                      >
                        다른 영상 {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {notices.length > 0 ? (
              <section className="unova-news">
                <div className="unova-panel-title">최근 소식</div>
                <ul className="unova-news__list">
                  {notices.slice(0, 5).map((n, idx) => (
                    <li key={idx} className="unova-news__item">
                      <span className={`unova-news__tag tag-${n.tag}`}>{n.tag}</span>
                      <span className="unova-news__text">{n.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      {/* 광고 이미지 (상단 섹터 아래) */}
      <section className="unova-promo" aria-label="선생님 광고 배너">
        <div className="unova-promo__inner">
          {teacher.promoImageUrl ? (
            <Image
              src={teacher.promoImageUrl}
              alt={`${teacher.name} 선생님 광고 배너`}
              fill
              className="unova-promo__img"
              sizes="(max-width: 1000px) 100vw, 72rem"
              priority={false}
            />
          ) : (
            <div className="unova-promo__empty">관리자에서 광고 이미지를 등록하면 여기에 노출됩니다.</div>
          )}
        </div>
      </section>

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
                <p className="unova-modal-p">{teacher.profile.education.content}</p>
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

