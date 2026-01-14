import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      // 레거시/오타 경로 호환: /notice -> /notices
      { source: "/notice", destination: "/notices", permanent: true },
      { source: "/notice/:path*", destination: "/notices/:path*", permanent: true },
    ];
  },
  // NOTE: Next.js 16.0.10의 `devIndicators` 옵션은 위치(position)만 지원합니다.
  // (이전 버전/문서에서 보이는 buildActivity 같은 플래그는 타입 에러로 빌드가 실패할 수 있어 제거)
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
