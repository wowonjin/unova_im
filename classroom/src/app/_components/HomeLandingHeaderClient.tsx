"use client";

import LandingHeader from "./LandingHeader";

export default function HomeLandingHeaderClient() {
  // Home(/)에서 서버/클라이언트 첫 렌더 결과가 달라지지 않도록
  // 동적(no-SSR) 래퍼 없이 그대로 렌더합니다.
  return <LandingHeader />;
}

