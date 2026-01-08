"use client";

import { useEffect } from "react";

function getOrCreateVisitorId(): string {
  try {
    let vid = window.localStorage.getItem("visitorId");
    if (!vid) {
      // 가볍고 충분히 유니크한 값 (서버/DB용 식별자)
      vid = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem("visitorId", vid);
    }
    return vid;
  } catch {
    // localStorage가 막힌 환경이면 매번 임시 ID
    return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function shouldSkip(path: string): boolean {
  // 정적/내부 요청 제외 (중복 이벤트 폭주 방지)
  return (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/favicon") ||
    path.startsWith("/robots") ||
    path.startsWith("/sitemap")
  );
}

export default function AnalyticsTracker() {
  useEffect(() => {
    const path = window.location.pathname || "/";
    if (shouldSkip(path)) return;

    const vid = getOrCreateVisitorId();

    // 짧은 시간 내 중복 방지 (뒤로가기/리렌더/레이아웃 재마운트 등)
    try {
      const key = `pv:${path}`;
      const last = window.sessionStorage.getItem(key);
      const now = Date.now();
      if (last && now - parseInt(last, 10) < 10_000) return;
      window.sessionStorage.setItem(key, String(now));
    } catch {
      // ignore
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId: vid,
        path,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent || null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}

