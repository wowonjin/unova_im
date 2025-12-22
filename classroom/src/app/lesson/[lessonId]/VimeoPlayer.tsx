"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { emitProgressUpdated } from "@/lib/progress-events";
import { useSearchParams } from "next/navigation";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

type Props = {
  lessonId: string;
  vimeoVideoId: string;
};

export default function VimeoPlayer({ lessonId, vimeoVideoId }: Props) {
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const pendingRef = useRef<{ seconds: number; duration?: number } | null>(null);
  const durationRef = useRef<number | null>(null);
  const lastSecondsRef = useRef<number>(0);
  const lastUiEmitAtRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeId = `vimeo-${lessonId}`;
  const numericId = String(vimeoVideoId ?? "").trim();
  const src = `https://player.vimeo.com/video/${encodeURIComponent(numericId)}?dnt=1&title=0&byline=0&portrait=0`;

  const saveProgress = useCallback(async (seconds: number, duration?: number) => {
    try {
      const res = await fetch(withAllParamIfNeeded(`/api/progress/${lessonId}`, allowAll), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lastSeconds: seconds, durationSeconds: duration }),
      });
      // UI 갱신은 timeupdate 기반으로 즉시 처리하고, 서버 저장은 백그라운드로만 수행
      if (!res.ok) return;
    } catch {
      // ignore
    }
  }, [lessonId, allowAll]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(async () => {
      flushTimerRef.current = null;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (!p) return;
      await saveProgress(p.seconds, p.duration);
    }, 6000); // 6초마다 저장(쓰로틀링)
  }, [saveProgress]);

  const emitUiProgress = useCallback((seconds: number, percent01?: number) => {
    const now = Date.now();
    if (now - lastUiEmitAtRef.current < 500) return; // UI 쓰로틀(너무 잦은 렌더 방지)
    lastUiEmitAtRef.current = now;

    let percent100: number | null = null;
    if (typeof percent01 === "number" && Number.isFinite(percent01)) {
      percent100 = percent01 * 100;
    } else if (durationRef.current && durationRef.current > 0) {
      percent100 = (seconds / durationRef.current) * 100;
    }
    if (percent100 == null) return;

    const pct = Math.max(0, Math.min(100, percent100));
    emitProgressUpdated({ lessonId, percent: pct, completed: pct >= 90 });
  }, [lessonId]);

  useEffect(() => {
    // 페이지 이탈/백그라운드 시 마지막 진도 저장(sendBeacon 우선)
    const flushNow = () => {
      const seconds = pendingRef.current?.seconds ?? lastSecondsRef.current ?? 0;
      const duration = pendingRef.current?.duration ?? durationRef.current ?? undefined;
      // 라우트 이동/탭 닫기 등에서 마지막 진도를 최대한 보존
      if (!Number.isFinite(seconds) || seconds <= 0) return;

      const payload = JSON.stringify({ lastSeconds: seconds, durationSeconds: duration });
      const url = new URL(withAllParamIfNeeded(`/api/progress/${lessonId}`, allowAll), window.location.origin).toString();
      try {
        if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          const blob = new Blob([payload], { type: "application/json" });
          // sendBeacon은 동기 블로킹 없이 종료 시점에도 전송 성공률이 높음
          (navigator as Navigator).sendBeacon(url, blob);
          return;
        }
      } catch {
        // ignore
      }

      // fallback (keepalive)
      try {
        fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
      } catch {
        // ignore
      }
    };

    const onPageHide = () => flushNow();
    const onVis = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      // SPA 라우팅(다른 강의로 이동)에서는 pagehide가 안 뜰 수 있어 언마운트 시점에도 flush
      flushNow();
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [lessonId, allowAll]);

  useEffect(() => {
    if (!numericId || !/^\d+$/.test(numericId)) {
      setError("Vimeo ID 형식이 올바르지 않습니다.");
      setReady(false);
      return;
    }

    const el = iframeRef.current;
    if (!el) return;

    let player: Player | null = null;
    try {
      // iframe 기반으로 Player를 붙이면 화면은 즉시 보이고, SDK로 진도/길이도 가져올 수 있음
      player = new Player(el);
      playerRef.current = player;
    } catch {
      setError("플레이어를 불러오지 못했습니다.");
      setReady(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        // player.js는 내부적으로 postMessage 핸드셰이크가 필요해서 ready()를 기다리는 게 안정적
        await player!.ready().catch(() => null);

        // 이어보기 위치 가져오기
        const res = await fetch(withAllParamIfNeeded(`/api/progress/${lessonId}`, allowAll), { method: "GET" });
        const data = await res.json().catch(() => null);
        const lastSeconds = data?.progress?.lastSeconds ?? 0;
        lastSecondsRef.current = Math.max(0, lastSeconds);

        const duration = await player!.getDuration().catch(() => null);
        if (duration && typeof duration === "number") {
          durationRef.current = duration;
          // duration을 서버에 1회 저장(lesson.durationSeconds 채우기용)
          pendingRef.current = { seconds: Math.max(0, lastSeconds), duration };
          scheduleFlush();
        }

        if (lastSeconds > 2) {
          await player!.setCurrentTime(lastSeconds);
        }
        if (mounted) setReady(true);
      } catch {
        if (mounted) setError("플레이어를 불러오지 못했습니다.");
      }
    })();

    const onLoaded = async () => {
      const d = await player!.getDuration().catch(() => null);
      if (typeof d === "number" && Number.isFinite(d) && d > 0) durationRef.current = d;
    };

    const onDurationChange = async () => {
      const d = await player!.getDuration().catch(() => null);
      if (typeof d === "number" && Number.isFinite(d) && d > 0) durationRef.current = d;
    };

    const onTimeUpdate = async (evt: { seconds: number; duration?: number; percent?: number }) => {
      lastSecondsRef.current = Math.max(0, evt.seconds);
      if (typeof evt.duration === "number" && Number.isFinite(evt.duration) && evt.duration > 0) {
        durationRef.current = evt.duration;
      }
      // UI는 즉시 반영(퍼센트/시간 기반)
      emitUiProgress(evt.seconds, evt.percent);

      // 서버 저장은 쓰로틀링
      pendingRef.current = { seconds: evt.seconds, duration: durationRef.current ?? undefined };
      scheduleFlush();
    };

    const onPause = async () => {
      const seconds = await player!.getCurrentTime().catch(() => null);
      const duration = await player!.getDuration().catch(() => null);
      if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
        durationRef.current = duration;
      }
      if (typeof seconds === "number") {
        lastSecondsRef.current = Math.max(0, seconds);
        emitUiProgress(seconds);
        pendingRef.current = { seconds, duration: durationRef.current ?? undefined };
        scheduleFlush();
      }
    };

    const onEnded = async () => {
      const duration = await player!.getDuration().catch(() => null);
      if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
        durationRef.current = duration;
        lastSecondsRef.current = duration;
        emitUiProgress(duration, 1);
        await saveProgress(duration, duration);
      }
    };

    player!.on("timeupdate", onTimeUpdate);
    player!.on("loaded", onLoaded);
    player!.on("durationchange", onDurationChange);
    player!.on("pause", onPause);
    player!.on("ended", onEnded);

    return () => {
      mounted = false;
      try {
        player!.off("timeupdate", onTimeUpdate);
        player!.off("loaded", onLoaded);
        player!.off("durationchange", onDurationChange);
        player!.off("pause", onPause);
        player!.off("ended", onEnded);
        // destroy()는 iframe을 DOM에서 제거할 수 있어(특히 dev StrictMode의 effect double-invoke에서)
        // 첫 진입 시 플레이어가 안 보이는 현상을 유발할 수 있음 → unload로 교체
        player!.unload().catch(() => {});
      } catch {}
      playerRef.current = null;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [lessonId, numericId, saveProgress, scheduleFlush, allowAll]);

  return (
    <div>
      <div className="w-full overflow-hidden rounded-2xl bg-black">
        {/* aspect-ratio 유틸이 누락되어도 안정적으로 16:9 유지 */}
        <div className="relative w-full pt-[56.25%]">
          <iframe
            ref={iframeRef}
            id={iframeId}
            src={src}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vimeo player"
          />
        </div>
      </div>
      {!ready && !error ? <p className="mt-3 text-sm text-white/70">플레이어 로딩 중...</p> : null}
      {error ? <p className="mt-3 text-sm text-white/60">{error}</p> : null}
    </div>
  );
}


