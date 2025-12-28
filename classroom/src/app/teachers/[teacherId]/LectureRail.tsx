'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

export type Lecture = {
  title: string;
  thumbnail: string;
  href: string;
  accent?: string;
};

export type LectureSet = {
  id: string;
  label: string;
  lectures: Lecture[];
};

type Props = {
  title?: string;
  curriculumLink?: string;
  lectureSets: LectureSet[];
  defaultTab?: string;
};

export default function LectureRail({ 
  title = "강의 구매하기.", 
  curriculumLink,
  lectureSets, 
  defaultTab 
}: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab || lectureSets[0]?.id || '');
  const [isVisible, setIsVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const currentLectures = lectureSets.find(set => set.id === activeTab)?.lectures || [];

  // 인디케이터 위치 업데이트
  const updateIndicator = useCallback(() => {
    if (!pillRef.current || !indicatorRef.current) return;
    const activeBtn = pillRef.current.querySelector('.unova-subject__btn.is-active') as HTMLElement;
    if (!activeBtn) return;
    const pillRect = pillRef.current.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const left = btnRect.left - pillRect.left;
    indicatorRef.current.style.width = `${btnRect.width}px`;
    // 세로는 중앙 고정(-50%), 가로만 이동
    indicatorRef.current.style.transform = `translate3d(${left}px, -50%, 0)`;
  }, []);

  // 스크롤 버튼 상태 업데이트
  const updateButtons = useCallback(() => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const x = track.scrollLeft;
    const eps = 2;
    setCanScrollPrev(maxScroll > 8 && x > eps);
    setCanScrollNext(maxScroll > 8 && x < maxScroll - eps);
  }, []);

  // 탭 변경 시 인덱스 리셋
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.scrollLeft = 0;
    }
    requestAnimationFrame(() => {
      updateIndicator();
      updateButtons();
    });
  }, [activeTab, updateIndicator, updateButtons]);

  // 뷰포트 진입 감지
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setTimeout(() => setControlsVisible(true), 100);
        } else {
          setIsVisible(false);
          setControlsVisible(false);
        }
      });
    }, { threshold: 0.01, rootMargin: '-12% 0px -12% 0px' });

    if (rootRef.current) {
      observer.observe(rootRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 리사이즈/스크롤 시 업데이트
  useEffect(() => {
    window.addEventListener('resize', updateIndicator, { passive: true });
    window.addEventListener('resize', updateButtons, { passive: true });
    return () => {
      window.removeEventListener('resize', updateIndicator);
      window.removeEventListener('resize', updateButtons);
    };
  }, [updateIndicator, updateButtons]);

  // 초기 마운트 시 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      updateIndicator();
      updateButtons();
    }, 100);
    return () => clearTimeout(timer);
  }, [updateIndicator, updateButtons]);

  // 스크롤 이벤트
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', updateButtons, { passive: true });
    return () => track.removeEventListener('scroll', updateButtons);
  }, [updateButtons]);

  // 페이지 단위 이동 계산
  const getPageStep = () => {
    if (!trackRef.current) return 0;
    const track = trackRef.current;
    const firstCard = track.querySelector('.unova-lec-card') as HTMLElement;
    if (!firstCard) return track.clientWidth;
    
    const gap = 26;
    const cardW = firstCard.getBoundingClientRect().width;
    const unit = cardW + gap;
    const visibleCount = Math.max(1, Math.round((track.clientWidth + gap) / unit));
    return visibleCount * unit;
  };

  const snapToNearest = (targetLeft: number) => {
    if (!trackRef.current) return targetLeft;
    const track = trackRef.current;
    const firstCard = track.querySelector('.unova-lec-card') as HTMLElement;
    if (!firstCard) return targetLeft;
    
    const gap = 26;
    const cardW = firstCard.getBoundingClientRect().width;
    const unit = cardW + gap;
    return Math.round(targetLeft / unit) * unit;
  };

  const handlePrev = () => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const nextLeft = snapToNearest(track.scrollLeft - getPageStep());
    track.scrollTo({ left: Math.max(0, nextLeft), behavior: 'smooth' });
  };

  const handleNext = () => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const nextLeft = snapToNearest(track.scrollLeft + getPageStep());
    track.scrollTo({ left: Math.min(maxScroll, nextLeft), behavior: 'smooth' });
  };

  return (
    <section ref={rootRef} className="unova-ios">
      <div className="unova-ios__inner">
        <header className="unova-ios__head">
          <h2 className="unova-ios__title">{title}</h2>
          {curriculumLink && (
            <a className="unova-ios__link" href={curriculumLink} target="_blank" rel="noopener noreferrer">
              커리큘럼 알아보기 <span aria-hidden="true">›</span>
            </a>
          )}
        </header>

        <div className="unova-ios__rail" aria-label="기능 하이라이트">
          <div ref={trackRef} className="unova-ios__track" role="list">
            {currentLectures.map((lecture, idx) => (
              <a
                key={`${activeTab}-${idx}`}
                href={lecture.href}
                className={`unova-lec-card ${isVisible ? 'is-in' : ''}`}
                role="listitem"
                style={{ 
                  '--delay': `${idx * 80}ms`,
                  '--a': lecture.accent || '#6EA8FF'
                } as React.CSSProperties}
              >
                <div className="unova-lec-card__media">
                  <img
                    src={lecture.thumbnail}
                    alt={lecture.title}
                    loading="lazy"
                  />
                </div>
              </a>
            ))}
          </div>

          {/* 하단 컨트롤 */}
          <div className={`unova-ios__controls ${controlsVisible ? 'is-in' : ''}`}>
            {lectureSets.length > 1 && (
              <div ref={pillRef} className="unova-subject" role="tablist" aria-label="과목 선택">
                <span ref={indicatorRef} className="unova-subject__indicator" aria-hidden="true" />
                {lectureSets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    className={`unova-subject__btn ${activeTab === set.id ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === set.id}
                    onClick={() => setActiveTab(set.id)}
                  >
                    {set.label}
                  </button>
                ))}
              </div>
            )}

            <div className="unova-arrows" aria-label="이동 버튼">
              <button
                className="unova-arrow unova-arrow--prev"
                type="button"
                aria-label="이전"
                disabled={!canScrollPrev}
                onClick={handlePrev}
              />
              <button
                className="unova-arrow unova-arrow--next"
                type="button"
                aria-label="다음"
                disabled={!canScrollNext}
                onClick={handleNext}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

