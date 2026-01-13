import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 개발 모드에서 좌측 하단에 "Rendering" 같은 상태 표시가 뜨는 경우가 있습니다.
  // (Next dev indicator / build activity indicator) 필요 없으면 끌 수 있습니다.
  devIndicators: {
    buildActivity: false,
  },
  // Turbopack이 워크스페이스 루트를 잘못 추론(상위 lockfile 선택)하면
  // 서버/클라 번들 루트가 어긋나 hydration mismatch가 발생할 수 있습니다.
  // 앱 루트(classroom/)를 명시해서 고정합니다.
  turbopack: {
    // next dev 실행 시점의 cwd가 classroom/ 이므로 process.cwd()를 사용하면
    // ESM/CJS 로딩 방식 차이로 인한 next.config 로딩 오류를 피할 수 있습니다.
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.imweb.me',
      },
      {
        protocol: 'https',
        hostname: 'img.etoos.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
};

export default nextConfig;
