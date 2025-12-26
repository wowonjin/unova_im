'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type Book = {
  title: string;
  sub: string;
  href: string;
  cover: string;
};

export type BookSet = {
  id: string;
  label: string;
  books: Book[];
};

type Props = {
  title?: string;
  bookSets: BookSet[];
  defaultTab?: string;
};

export default function BookCoverFlow({ title = "교재 구매하기.", bookSets, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab || bookSets[0]?.id || '');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const originRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  const currentBooks = bookSets.find(set => set.id === activeTab)?.books || [];

  // 인디케이터 위치 업데이트
  const updateIndicator = useCallback(() => {
    if (!pillRef.current || !indicatorRef.current) return;
    const activeBtn = pillRef.current.querySelector('.unova-pill__btn.is-active') as HTMLElement;
    if (!activeBtn) return;
    const pillRect = pillRef.current.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const left = btnRect.left - pillRect.left;
    indicatorRef.current.style.width = `${btnRect.width}px`;
    indicatorRef.current.style.transform = `translateX(${left}px)`;
  }, []);

  // CSS 변수 값 가져오기
  const getCSSVar = useCallback((name: string) => {
    if (!rootRef.current) return 0;
    return parseFloat(getComputedStyle(rootRef.current).getPropertyValue(name)) || 0;
  }, []);

  // 탭 변경 시 인덱스 리셋
  useEffect(() => {
    setCurrentIdx(0);
    requestAnimationFrame(updateIndicator);
  }, [activeTab, updateIndicator]);

  // 뷰포트 진입 감지
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setIsMounted(true);
        } else {
          setIsVisible(false);
          setIsMounted(false);
        }
      });
    }, { threshold: 0.3 });

    if (rootRef.current) {
      observer.observe(rootRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 리사이즈 시 인디케이터 업데이트
  useEffect(() => {
    window.addEventListener('resize', updateIndicator, { passive: true });
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // 초기 마운트 시 인디케이터 업데이트
  useEffect(() => {
    const timer = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timer);
  }, [updateIndicator]);

  const focusAt = (i: number) => {
    const n = currentBooks.length;
    if (n === 0) return;
    setCurrentIdx(((i % n) + n) % n);
  };

  const handleBookClick = (i: number, book: Book) => {
    if (i === currentIdx) {
      window.location.href = book.href;
    } else {
      focusAt(i);
    }
  };

  const getBookStyle = (i: number) => {
    const n = currentBooks.length;
    let offset = i - currentIdx;
    if (offset > n / 2) offset -= n;
    if (offset < -n / 2) offset += n;

    const abs = Math.abs(offset);
    const step = 340;
    const zStep = 200;
    const x = offset * step;
    const z = -abs * zStep;
    const rot = -offset * 35;
    const scale = 1 - abs * 0.12;
    const opacity = abs > 3 ? 0 : (1 - abs * 0.18);
    const bright = 1 - abs * 0.08;

    return {
      transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rot}deg) scale(${scale})`,
      opacity,
      zIndex: 100 - abs,
      filter: `brightness(${bright})`,
    };
  };

  return (
    <section className="unova-bookwall-section">
      {/* 타이틀 */}
      <h2 className="unova-bookwall-title">{title}</h2>

      {/* 커버플로우 */}
      <div
        ref={rootRef}
        className={`unova-bookwall ${isVisible ? 'is-visible' : ''}`}
      >
        <div className="unova-bookwall-inner">
          <div ref={stageRef} className="unova-stage" aria-label="교재 커버플로우">
            <div ref={originRef} className="unova-origin">
              {currentBooks.map((book, i) => (
                <div
                  key={`${activeTab}-${i}`}
                  className="unova-book"
                  style={getBookStyle(i)}
                  onClick={() => handleBookClick(i, book)}
                >
                  <div
                    className="unova-cover"
                    style={{ '--unova-cover': `url('${book.cover}')` } as React.CSSProperties}
                  />
                  <div className="unova-floor" />
                  <div className="unova-txt">
                    <p className="unova-title">{book.title}</p>
                    <p className="unova-sub">{book.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 과목 토글 */}
      {bookSets.length > 1 && (
        <div
          className={`unova-phy-switcher ${isMounted ? 'is-mounted' : ''}`}
        >
          <div className="unova-phy__inner">
            <div className="unova-bottomwrap">
              <div ref={pillRef} className="unova-pill" role="tablist" aria-label="과목 선택">
                <span ref={indicatorRef} className="unova-pill__indicator" aria-hidden="true" />
                {bookSets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    className={`unova-pill__btn ${activeTab === set.id ? 'is-active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === set.id}
                    onClick={() => setActiveTab(set.id)}
                  >
                    {set.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


