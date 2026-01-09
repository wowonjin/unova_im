"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WithdrawClient() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirm.trim() === "탈퇴";

  const withdraw = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "탈퇴 처리에 실패했습니다.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[13px] text-red-200">
        <p className="font-semibold">주의</p>
        <ul className="mt-2 space-y-1 text-red-200/90">
          <li>- 탈퇴 후에는 계정 복구가 어려울 수 있습니다.</li>
          <li>- 결제/주문 이력, 학습 기록 등이 삭제될 수 있습니다.</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      )}

      <div>
        <p className="text-[13px] text-white/60 mb-2">
          진행하려면 아래에 <span className="text-white font-semibold">탈퇴</span> 를 입력하세요.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none focus:border-white/30"
          placeholder="탈퇴"
        />
      </div>

      <button
        onClick={withdraw}
        disabled={!canSubmit || loading}
        className="w-full py-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-500/90 transition-colors disabled:opacity-50"
      >
        {loading ? "처리 중..." : "회원 탈퇴하기"}
      </button>
    </div>
  );
}

