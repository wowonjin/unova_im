"use client";

export default function FloatingKakaoButton() {
  const href = "https://pf.kakao.com/_xinPAn/chat";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="카카오톡 질문방으로 이동"
      className="fixed bottom-4 right-4 z-[60] inline-flex h-12 items-center gap-1 rounded-full bg-[#FEE500] px-3 shadow-lg shadow-black/30 ring-1 ring-black/10 hover:brightness-95 active:brightness-90 md:bottom-5 md:right-5 md:h-14 md:px-4"
    >
      {/* 아이콘: 카카오톡 느낌(심플 버블) */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="md:hidden">
        <path
          d="M12 4.5c-4.42 0-8 2.74-8 6.12 0 2.2 1.55 4.12 3.94 5.18-.17.6-.62 2.18-.71 2.55-.11.45.16.44.33.33.13-.09 2.1-1.44 2.94-2.02.48.07.98.1 1.5.1 4.42 0 8-2.74 8-6.12S16.42 4.5 12 4.5Z"
          fill="#111111"
        />
      </svg>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="hidden md:block">
        <path
          d="M12 4.5c-4.42 0-8 2.74-8 6.12 0 2.2 1.55 4.12 3.94 5.18-.17.6-.62 2.18-.71 2.55-.11.45.16.44.33.33.13-.09 2.1-1.44 2.94-2.02.48.07.98.1 1.5.1 4.42 0 8-2.74 8-6.12S16.42 4.5 12 4.5Z"
          fill="#111111"
        />
      </svg>
      <span className="text-sm font-semibold text-black md:text-base">문의</span>
    </a>
  );
}


