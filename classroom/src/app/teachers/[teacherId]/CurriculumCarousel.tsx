'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type CurriculumSlide = {
  title: string;
  sub?: string;
  images: string[];
};

type Props = {
  slides: CurriculumSlide[];
  title?: string;
};

const AUTOPLAY_MS = 5200;
const SWIPE_THRESHOLD = 42;

export default function CurriculumCarousel({ slides, title = "커리큘럼 확인하기." }: Props) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const [gap, setGap] = useState(22);
  const [peek, setPeek] = useState(140);

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dx, setDx] = useState(0);
  const [baseX, setBaseX] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const t0Ref = useRef(performance.now());
  const rafRef = useRef<number>();

  // 슬라이드 크기 계산
  const measure = useCallback(() => {
    if (!stageRef.current || !carouselRef.current) return;

    const styles = getComputedStyle(carouselRef.current);
    const peekValue = parseFloat(styles.getPropertyValue('--peek')) || 140;
    const gapValue = parseFloat(styles.getPropertyValue('--gap')) || 22;

    setPeek(peekValue);
    setGap(gapValue);

    const width = Math.max(280, stageRef.current.clientWidth - peekValue);
    setSlideWidth(width);
  }, []);

  // 슬라이드 이동
  const goTo = useCallback((i: number, animate = true) => {
    const newIndex = ((i % slides.length) + slides.length) % slides.length;
    setIndex(newIndex);

    const offset = peek / 2;
    const x = -(newIndex * (slideWidth + gap)) + offset;
    setBaseX(x);

    if (trackRef.current) {
      trackRef.current.style.transition = animate
        ? 'transform .58s cubic-bezier(.2,.85,.2,1)'
        : 'none';
      trackRef.current.style.transform = `translate3d(${x}px,0,0)`;
    }

    t0Ref.current = performance.now();
    setProgress(0);
  }, [slides.length, slideWidth, gap, peek]);

  const next = useCallback(() => goTo(index + 1, true), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, true), [goTo, index]);

  // 자동재생 루프
  useEffect(() => {
    const loop = (ts: number) => {
      if (isPlaying && isVisible) {
        const p = Math.min(1, (ts - t0Ref.current) / AUTOPLAY_MS);
        setProgress(p);
        if (p >= 1) {
          next();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, isVisible, next]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 리사이즈 핸들러
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // 슬라이드 크기 변경 시 위치 업데이트
  useEffect(() => {
    if (slideWidth > 0) {
      goTo(index, false);
    }
  }, [slideWidth, index, goTo]);

  // 드래그 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setDx(0);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    setDx(delta);
    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
      trackRef.current.style.transform = `translate3d(${baseX + delta}px,0,0)`;
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    } else {
      goTo(index, true);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    t0Ref.current = performance.now();
    setProgress(0);
  };

  return (
    <section className="uac-section" id="curriculum-section">
      <div className="uac-content">
        {/* 제목 */}
        <h2 className="uac-section-title">{title}</h2>

        <div
          ref={carouselRef}
          className={`uac-carousel ${isVisible ? 'is-visible is-active' : ''}`}
        >
          <div ref={stageRef} className="uac-stage">
            <div
              ref={trackRef}
              className={`uac-track ${isDragging ? 'is-dragging' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={() => isDragging && handlePointerUp()}
            >
              {slides.map((slide, idx) => (
                <div
                  key={idx}
                  className="uac-slide"
                  style={{ width: slideWidth > 0 ? `${slideWidth}px` : 'auto' }}
                >
                  <div className="uac-inner">
                    <div className="uac-title">
                      {slide.title.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < slide.title.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                      {slide.sub && <div className="uac-sub">{slide.sub}</div>}
                    </div>
                    <div className="uac-media">
                      {slide.images.slice(0, 3).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className={i === 1 ? 'is-center' : ''}
                          style={{ objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UI 컨트롤 */}
          <div className="uac-ui">
            <div className="uac-pager">
              <div className="uac-progress">
                <span style={{ '--p': progress } as React.CSSProperties} />
              </div>
              <div className="uac-dots">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`uac-dot ${i === index ? 'is-active' : ''}`}
                    onClick={() => goTo(i, true)}
                    role="tab"
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              className="uac-toggle"
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause autoplay' : 'Play autoplay'}
            >
              <span className={`uac-ico ${isPlaying ? 'pause' : 'play'}`} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

