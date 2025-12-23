"use client";

import { useState } from "react";
import LoginModal from "./LoginModal";

type Props = {
  isLoggedIn: boolean;
};

export default function DashboardEmptyState({ isLoggedIn }: Props) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (!isLoggedIn) {
    return (
      <>
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <span
              className="material-symbols-outlined text-white/50"
              style={{ fontSize: "32px" }}
            >
              login
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">로그인이 필요합니다</p>
            <p className="mt-1 text-sm text-white/60">
              이메일을 입력하여 로그인하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              login
            </span>
            로그인
          </button>
        </div>

        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    );
  }

  // 로그인은 했지만 강좌가 없는 경우
  return (
    <div className="space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
        <span
          className="material-symbols-outlined text-white/50"
          style={{ fontSize: "32px" }}
        >
          inbox
        </span>
      </div>
      <div>
        <p className="text-lg font-semibold text-white">수강 중인 강좌가 없습니다</p>
        <p className="mt-1 text-sm text-white/60">
          등록된 강좌가 없습니다.
        </p>
      </div>
    </div>
  );
}

