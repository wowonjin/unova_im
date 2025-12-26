"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MyPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full py-4 rounded-xl border border-white/20 text-[15px] text-white/80 hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}

