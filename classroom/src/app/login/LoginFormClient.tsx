"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginFormClient({
  redirectTo,
}: {
  redirectTo: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          INVALID_EMAIL: "올바른 이메일 주소를 입력해주세요.",
          SERVER_ERROR: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
        setError(errorMessages[data.error] || "오류가 발생했습니다.");
        return;
      }

      // 로그인 성공
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-white/70">
          이메일을 입력하세요
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          autoFocus
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
            로그인 중...
          </span>
        ) : (
          "로그인"
        )}
      </button>

      <p className="text-center text-xs text-white/40">
        로그인 후 6시간 동안 자동 로그인됩니다
      </p>
    </form>
  );
}
