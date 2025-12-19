"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

type Props = {
  lessonId: string;
  vimeoVideoId: string;
};

export default function VimeoPlayer({ lessonId, vimeoVideoId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const pendingRef = useRef<{ seconds: number; duration?: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeId = `vimeo-${lessonId}`;

  const saveProgress = useCallback(async (seconds: number, duration?: number) => {
    await fetch(`/api/progress/${lessonId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lastSeconds: seconds, durationSeconds: duration }),
    }).catch(() => {});
  }, [lessonId]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(async () => {
      flushTimerRef.current = null;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (!p) return;
      await saveProgress(p.seconds, p.duration);
    }, 8000); // 8초마다 저장
  }, [saveProgress]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const player = new Player(el, {
      id: Number(vimeoVideoId),
      responsive: true,
    });
    playerRef.current = player;

    let mounted = true;

    (async () => {
      try {
        // 이어보기 위치 가져오기
        const res = await fetch(`/api/progress/${lessonId}`, { method: "GET" });
        const data = await res.json().catch(() => null);
        const lastSeconds = data?.progress?.lastSeconds ?? 0;

        const duration = await player.getDuration().catch(() => null);
        if (duration && typeof duration === "number") {
          // duration을 서버에 1회 저장(lesson.durationSeconds 채우기용)
          pendingRef.current = { seconds: Math.max(0, lastSeconds), duration };
          scheduleFlush();
        }

        if (lastSeconds > 2) {
          await player.setCurrentTime(lastSeconds);
        }
        if (mounted) setReady(true);
      } catch {
        if (mounted) setError("플레이어를 불러오지 못했습니다.");
      }
    })();

    const onTimeUpdate = async (evt: { seconds: number; duration: number }) => {
      pendingRef.current = { seconds: evt.seconds, duration: evt.duration };
      scheduleFlush();
    };

    const onPause = async () => {
      const seconds = await player.getCurrentTime().catch(() => null);
      const duration = await player.getDuration().catch(() => null);
      if (typeof seconds === "number") {
        pendingRef.current = { seconds, duration: typeof duration === "number" ? duration : undefined };
        scheduleFlush();
      }
    };

    const onEnded = async () => {
      const duration = await player.getDuration().catch(() => null);
      if (typeof duration === "number") await saveProgress(duration, duration);
    };

    player.on("timeupdate", onTimeUpdate);
    player.on("pause", onPause);
    player.on("ended", onEnded);

    return () => {
      mounted = false;
      try {
        player.off("timeupdate", onTimeUpdate);
        player.off("pause", onPause);
        player.off("ended", onEnded);
        player.destroy();
      } catch {}
      playerRef.current = null;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [lessonId, vimeoVideoId, saveProgress, scheduleFlush]);

  return (
    <div>
      {/* 플레이어 로딩 실패 문구는 UI에 노출하지 않음 */}
      <div id={iframeId} ref={containerRef} className="aspect-video w-full overflow-hidden bg-black" />
      {!ready && !error ? <p className="mt-3 text-sm text-white/70">플레이어 로딩 중...</p> : null}
    </div>
  );
}


