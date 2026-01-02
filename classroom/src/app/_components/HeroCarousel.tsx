"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Slide {
  href: string;
  image: string;
  tag: string;
  title: string;
  subtitle: string;
}

const defaultSlides: Slide[] = [
  {
    href: "https://unova.co.kr/physics1pdf",
    image: "https://storage.googleapis.com/physics2/%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%93%9C%20%EC%9D%B4%EB%AF%B8%EC%A7%80/%EB%AC%BC%EB%A6%AC.png",
    tag: "27학년도 수능대비",
    title: "한 권으로 끝내는<br>물리학I,II 방법론 교재",
    subtitle: "CONNECT PHYSICS I, II",
  },
  {
    href: "https://unova.co.kr/223",
    image: "https://storage.googleapis.com/physics2/%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%93%9C%20%EC%9D%B4%EB%AF%B8%EC%A7%80/%EC%88%98%ED%95%99.png",
    tag: "27학년도 수능대비",
    title: "연세대학교 의과대학<br>백하욱 선생님 교재",
    subtitle: "CONNECT MATH",
  },
  {
    href: "https://unova.co.kr/262",
    image: "https://storage.googleapis.com/physics2/%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%93%9C%20%EC%9D%B4%EB%AF%B8%EC%A7%80/%ED%8E%B8%EC%9E%85%EC%88%98%ED%95%99.png",
    tag: "2026학년도 편입대비",
    title: "편입수학<br>완벽대비 [실전편]",
    subtitle: "CONNECT MATH",
  },
];

export type HeroCarouselSlide = Slide;

export default function HeroCarousel({ slides }: { slides?: Slide[] }) {
  const resolvedSlides = slides && slides.length > 0 ? slides : defaultSlides;
  const [currentIndex, setCurrentIndex] = useState(1); // 클론 포함, 1이 첫 번째 실제 슬라이드
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = resolvedSlides.length;
  const gap = 16;
  const slideRatio = 0.9; // 슬라이드 크기 (PC 기준)

  // 클론 포함 전체 슬라이드 배열 (무한 루프용)
  const allSlides = [resolvedSlides[resolvedSlides.length - 1], ...resolvedSlides, resolvedSlides[0]];

  // 슬라이드 너비 계산
  const updateSizes = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const newSlideWidth = Math.round(containerWidth * slideRatio);
    setSlideWidth(newSlideWidth);
  }, []);

  // 오프셋 계산 (슬라이드를 가운데로)
  const getOffset = useCallback((idx: number) => {
    if (!containerRef.current || slideWidth === 0) return 0;
    const containerWidth = containerRef.current.clientWidth;
    const peek = (containerWidth - slideWidth) / 2; // 양쪽 미리보기 공간
    return -(idx * (slideWidth + gap)) + peek;
  }, [slideWidth, gap]);

  // 트랙 위치 업데이트
  const updateTrackPosition = useCallback((idx: number, animate: boolean) => {
    if (!trackRef.current) return;
    const offset = getOffset(idx);
    // 부드러운 전환을 위해 cubic-bezier 이징 사용
    trackRef.current.style.transition = animate 
      ? "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)" 
      : "none";
    trackRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
  }, [getOffset]);

  // 슬라이드 이동
  const goToSlide = useCallback((idx: number, animate = true) => {
    if (isTransitioning && animate) return;

    if (animate) setIsTransitioning(true);
    setCurrentIndex(idx);
    updateTrackPosition(idx, animate);
  }, [isTransitioning, updateTrackPosition]);

  // 클론에서 실제 슬라이드로 점프 (무한 루프)
  useEffect(() => {
    if (!isTransitioning) return;

    const timeout = setTimeout(() => {
      setIsTransitioning(false);
      
      // 마지막 클론 → 첫 번째 실제 슬라이드
      if (currentIndex === 0) {
        setCurrentIndex(totalSlides);
        updateTrackPosition(totalSlides, false);
      }
      // 첫 번째 클론 → 마지막 실제 슬라이드
      else if (currentIndex === totalSlides + 1) {
        setCurrentIndex(1);
        updateTrackPosition(1, false);
      }
    }, 620);

    return () => clearTimeout(timeout);
  }, [currentIndex, isTransitioning, totalSlides, updateTrackPosition]);

  // 자동 재생
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToSlide(currentIndex + 1, true);
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentIndex, goToSlide]);

  // 리사이즈 대응
  useEffect(() => {
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, [updateSizes]);

  // 모바일 여부(슬라이드 높이 조정용)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 슬라이드 너비 변경시 위치 업데이트
  useEffect(() => {
    if (slideWidth > 0) {
      updateTrackPosition(currentIndex, false);
    }
    // 중요: currentIndex 변화 때마다 여기서 transition을 "none"으로 덮어쓰면
    // 슬라이드가 "툭" 바뀌는 것처럼 보이게 됩니다.
    // 따라서 리사이즈/너비 변경시에만 위치를 재보정합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideWidth]);

  // 논리적 인덱스 (카운터용, 1부터 시작)
  const logicalIndex = (() => {
    let idx = currentIndex - 1;
    if (idx < 0) idx = totalSlides - 1;
    if (idx >= totalSlides) idx = 0;
    return idx + 1;
  })();

  // 슬라이드 클릭 핸들러
  const handleSlideClick = (idx: number, e: React.MouseEvent) => {
    if (idx !== currentIndex) {
      e.preventDefault();
      goToSlide(idx, true);
    }
  };

  return (
    <section className="pt-[60px] lg:pt-[110px] pb-6 lg:pb-16">
      <div 
        ref={containerRef}
        className="relative mx-auto max-w-[1100px] overflow-visible"
      >
        {/* 슬라이드 트랙 */}
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{ gap: `${gap}px` }}
        >
          {allSlides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            
            return (
              <a
                key={idx}
                href={slide.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleSlideClick(idx, e)}
                className={`relative flex-shrink-0 rounded-[18px] overflow-hidden cursor-pointer transition-shadow duration-[600ms] ease-out ${
                  isActive 
                    ? "shadow-[0_0_40px_rgba(255,255,255,0.04),0_0_80px_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.18)]" 
                    : "shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                }`}
                style={{ 
                  width: slideWidth > 0 ? `${slideWidth}px` : `${slideRatio * 100}%`,
                  // 모바일에서 세로 길이를 더 길게(높이 증가)
                  aspectRatio: isMobile ? "2 / 1" : "2.5 / 1"
                }}
              >
                {/* 이미지 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.subtitle}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* 어두운 오버레이 (비활성 슬라이드) */}
                <div 
                  className={`absolute inset-0 bg-[#161616]/50 transition-opacity duration-[600ms] ease-out pointer-events-none z-10 ${
                    isActive ? "opacity-0" : "opacity-100"
                  }`}
                />
                
                {/* 텍스트 오버레이 */}
                <div 
                  className={`absolute left-4 md:left-[60px] top-1/2 -translate-y-1/2 z-20 max-w-[460px] transition-opacity duration-[400ms] ease-out ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="inline-block px-[10px] py-1 mb-[10px] rounded-full bg-white text-black text-[10px] md:text-[12px] font-medium">
                    {slide.tag}
                  </div>
                  <div
                    className="text-white text-[18px] md:text-[32px] font-bold leading-[1.35] mb-[6px] md:mb-[10px]"
                    style={{ textShadow: "0 4px 12px rgba(0, 0, 0, 0.32)" }}
                    dangerouslySetInnerHTML={{ __html: slide.title }}
                  />
                  <div className="text-white/90 text-[12px] md:text-[14px]">
                    {slide.subtitle}
                  </div>
                </div>

                {/* 모바일 카운터: 활성 슬라이드 우측 하단에 고정 */}
                {isActive ? (
                  <div className="md:hidden absolute right-3 bottom-3 z-30">
                    <div className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-sm text-xs text-white">
                      <strong className="font-semibold">{logicalIndex}</strong> / {totalSlides}
                    </div>
                  </div>
                ) : null}
              </a>
            );
          })}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-8 items-center gap-2 z-20">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white text-lg hover:bg-black/80 transition-colors"
            aria-label={isPlaying ? "자동재생 정지" : "자동재생 시작"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-sm text-white">
            <strong className="font-semibold">{logicalIndex}</strong> / {totalSlides}
          </div>
          <button
            type="button"
            onClick={() => goToSlide(currentIndex - 1, true)}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white text-lg hover:bg-black/80 transition-colors"
            aria-label="이전 배너"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goToSlide(currentIndex + 1, true)}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white text-lg hover:bg-black/80 transition-colors"
            aria-label="다음 배너"
          >
            ›
          </button>
        </div>

        {/* 모바일 카운터는 각 슬라이드 내부(활성 슬라이드)에 배치 */}
      </div>
    </section>
  );
}
