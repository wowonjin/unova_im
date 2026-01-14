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
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://unova-im.onrender.com",
  ),
  title: "유노바",
  description: "최상위권의 모든 지식을 담은 실전 독학서",
  icons: {
    // PC(데스크탑) 브라우저는 /favicon.ico 를 우선적으로 쓰는 경우가 많아
    // ico를 먼저 제공하고, png는 보조로 명시합니다.
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/favicon.png", type: "image/png", sizes: "180x180" }],
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
