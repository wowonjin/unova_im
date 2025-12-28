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

  return (
    <>
      <div className="unova-wrapper" ref={containerRef}>
        <div className="unova-container">
          {/* 왼쪽 사이드바 */}
          <div className="unova-left-col">
            <div className="unova-sidebar">
              <div
                className="unova-menu-item"
                onClick={() => setIsModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
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
                    if (e.key === 'Enter' || e.key === ' ') {
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
                    if (e.key === 'Enter' || e.key === ' ') {
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
                    if (e.key === 'Enter' || e.key === ' ') {
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
                    if (e.key === 'Enter' || e.key === ' ') {
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
                  aria-label={`${teacher.name} 선생님 ${social.type === 'instagram' ? '인스타그램' : '유튜브'}`}
                >
                  <Image
                    src={social.icon}
                    alt={`${social.type} 아이콘`}
                    width={12.5}
                    height={12.5}
                    className="unova-menu-icon"
                  />
                  {teacher.name}T {social.type === 'instagram' ? '인스타그램' : '유튜브'}
                </a>
              ))}
            </div>
          </div>

          {/* 중앙 콘텐츠 */}
          <div className="unova-content">
            {/* 헤더 */}
            <div className="unova-header-sub">{teacher.headerSub}</div>
            <div className="unova-header-title">
              <span className="unova-subject">{teacher.subject}</span> {teacher.name} 선생님
            </div>

            {/* 배너들 */}
            {teacher.banners.map((banner, idx) => (
              <div
                key={idx}
                className={`unova-banner-box ${banner.type === 'banner1' ? 'unova-banner-1' : 'unova-banner-2'}`}
              >
                {banner.isNew && <div className="unova-new-badge">NEW</div>}
                <div className="unova-banner-top-text">{banner.topText}</div>
                {banner.type === 'banner1' ? (
                  <div className="unova-banner-title-1">
                    <span>{banner.title}</span>
                  </div>
                ) : (
                  <div className="unova-banner-logo">{banner.title}</div>
                )}
              </div>
            ))}

            {/* 하단 (리뷰/새소식) */}
            <div className="unova-bottom-row">
              {/* 리뷰 박스 */}
              <div className="unova-review-box">
                <div className="unova-review-header">
                  <p className="unova-review-title">수강 후기</p>
                </div>
                {teacher.reviews.map((review, idx) => (
                  <div key={idx} className="unova-review-row" aria-label={`수강 후기 ${idx + 1}`}>
                    <div className="unova-review-text">{review.text}</div>
                    <div className="unova-review-stars" aria-label={`별점 5점 만점에 ${review.rating}점`}>
                      {'★'.repeat(review.rating)}
                    </div>
                  </div>
                ))}
              </div>

              {/* 새소식 리스트 */}
              <div className="unova-notice-box">
                <div className="unova-notice-header">
                  <span className="unova-notice-title">선생님 새소식</span>
                  <span style={{ fontSize: '16px', cursor: 'pointer' }}>+</span>
                </div>
                <ul className="unova-notice-list" style={{ padding: 0, margin: 0 }}>
                  {teacher.notices.map((notice, idx) => (
                    <li key={idx}>
                      <span className={`unova-tag tag-${notice.tag}`}>
                        {notice.tag === 'book' ? '교재' : notice.tag === 'event' ? '이벤트' : '공지'}
                      </span>
                      {notice.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 오른쪽 선생님 이미지 */}
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

