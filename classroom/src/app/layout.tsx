import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AnalyticsTracker from "@/app/_components/AnalyticsTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://unova.co.kr",
  ),
  title: "유노바",
  description: "최상위권의 모든 지식을 담은 실전 독학서",
  icons: {
    // 배포 환경에서 favicon.ico가 기본(Next) 아이콘으로 보이는 케이스 방지:
    // png 아이콘만 명시해서 브라우저가 이 링크를 우선 사용하도록 합니다.
    icon: [{ url: "/unova_pabicon.png", type: "image/png", sizes: "any" }],
    shortcut: [{ url: "/unova_pabicon.png", type: "image/png", sizes: "any" }],
    apple: [{ url: "/unova_pabicon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "유노바",
    description: "최상위권의 모든 지식을 담은 실전 독학서",
    images: [
      {
        url: "/unova_main.png",
        width: 1024,
        height: 1024,
        alt: "유노바",
      },
    ],
    siteName: "유노바",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "유노바",
    description: "최상위권의 모든 지식을 담은 실전 독학서",
    images: ["/unova_main.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
        {/* Quill editor styles (avoid bundler import path issues under Turbopack) */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
