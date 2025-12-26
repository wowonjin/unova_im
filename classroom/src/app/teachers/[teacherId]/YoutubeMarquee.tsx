'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type YoutubeVideo = {
  url: string;
};

type Props = {
  title?: string;
  videos: YoutubeVideo[];
  speed?: number;
};

// URL에서 유튜브 ID와 시작지점 파싱
function parseYouTube(url: string): { id: string | null; start: number } {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.replace("/", "");
    } else {
      id = u.searchParams.get("v");
    }

    let start = 0;
    const t = u.searchParams.get("t");
    if (t) {
      const m = t.match(/(\d+)s?/);
      if (m) start = parseInt(m[1], 10);
    }
    return { id, start };
  } catch {
    const regExp = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&#?]+)/;
    const match = url.match(regExp);
    return { id: match ? match[1] : null, start: 0 };
  }
}

export default function YoutubeMarquee({ title = "무료 해설 강의.", videos, speed = 40 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posXRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const posXOnDragStartRef = useRef(0);
  const contentWidthRef = useRef(0);
  const animationRef = useRef<number>();
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // 비디오 데이터 파싱
  const parsedVideos = videos.map(v => parseYouTube(v.url)).filter(v => v.id);

  // 제목 가져오기
  const fetchTitles = useCallback(async () => {
    const newTitles = new Map<string, string>();
    
    for (const video of parsedVideos) {
      if (!video.id) continue;
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${video.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.title) {
            newTitles.set(video.id, data.title);
          }
        }
      } catch {
        // ignore
      }
    }
    
    setTitles(newTitles);
  }, [parsedVideos.map(v => v.id).join(',')]);

  useEffect(() => {
    fetchTitles();
  }, []);

  // 애니메이션 루프
  useEffect(() => {
    if (!trackRef.current) return;
    
    // 컨텐츠 너비 계산 (복제 전 원본 너비)
    const track = trackRef.current;
    contentWidthRef.current = track.scrollWidth / 2;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (!isDraggingRef.current) {
        posXRef.current -= speed * delta;
      }

      if (posXRef.current <= -contentWidthRef.current) {
        posXRef.current += contentWidthRef.current;
      } else if (posXRef.current >= 0) {
        posXRef.current -= contentWidthRef.current;
      }

      if (track) {
        track.style.transform = `translateX(${posXRef.current}px)`;
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed, parsedVideos.length]);

  // 드래그 핸들러
  const startDrag = (clientX: number) => {
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    posXOnDragStartRef.current = posXRef.current;
    trackRef.current?.classList.add('dragging');
  };

  const moveDrag = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const delta = clientX - dragStartXRef.current;
    posXRef.current = posXOnDragStartRef.current + delta;

    if (posXRef.current <= -contentWidthRef.current) {
      posXRef.current += contentWidthRef.current;
      posXOnDragStartRef.current += contentWidthRef.current;
    } else if (posXRef.current >= 0) {
      posXRef.current -= contentWidthRef.current;
      posXOnDragStartRef.current -= contentWidthRef.current;
    }
  };

  const endDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    trackRef.current?.classList.remove('dragging');
  };

  // 마우스 이벤트
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      moveDrag(e.clientX);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 터치 이벤트
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    startDrag(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !e.touches || e.touches.length === 0) return;
      moveDrag(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      endDrag();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleVideoClick = (videoId: string, start: number) => {
    setPlayingVideo(`${videoId}-${start}`);
  };

  // 아이템 렌더링
  const renderItems = () => {
    return parsedVideos.map((video, idx) => {
      if (!video.id) return null;
      const thumbUrl = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
      const videoTitle = titles.get(video.id) || '제목을 불러오는 중...';
      const isPlaying = playingVideo === `${video.id}-${video.start}`;
      const embedSrc = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1${video.start > 0 ? `&start=${video.start}` : ''}`;

      return (
        <div key={`${video.id}-${idx}`} className="yt-marquee-item">
          <div className="yt-marquee-visual">
            {isPlaying ? (
              <iframe
                src={embedSrc}
                title="YouTube video"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div
                className="yt-marquee-thumb"
                style={{ backgroundImage: `url('${thumbUrl}')` }}
                onClick={() => handleVideoClick(video.id!, video.start)}
              />
            )}
          </div>
          <div className="yt-marquee-meta">
            <div className="yt-marquee-title">{videoTitle}</div>
          </div>
        </div>
      );
    });
  };

  return (
    <section className="yt-section">
      <h2 className="yt-section-title">{title}</h2>
      <div className="yt-marquee-container">
        <div
          ref={trackRef}
          className="yt-marquee-track"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {renderItems()}
          {renderItems()}
        </div>
      </div>
    </section>
  );
}

