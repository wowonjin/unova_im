"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "email" | "code";

export default function LoginFormClient({
  redirectTo,
}: {
  redirectTo: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          INVALID_EMAIL: "올바른 이메일 주소를 입력해주세요.",
          EMAIL_CONFIG_ERROR: "이메일 설정에 문제가 있습니다.",
          EMAIL_SEND_FAILED: "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
          SERVER_ERROR: "서버 오류가 발생했습니다.",
        };
        setError(errorMessages[data.error] || "오류가 발생했습니다.");
        return;
      }

      setCodeSent(true);
      setStep("code");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          INVALID_INPUT: "올바른 인증 코드를 입력해주세요.",
          INVALID_CODE: "인증 코드가 올바르지 않거나 만료되었습니다.",
          SERVER_ERROR: "서버 오류가 발생했습니다.",
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

  const handleResendCode = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        setError("인증 코드 재발송에 실패했습니다.");
        return;
      }

      setCodeSent(true);
      setCode("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "email") {
    return (
      <form onSubmit={handleRequestCode} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-white/70">
            이메일
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
              발송 중...
            </span>
          ) : (
            "인증 코드 받기"
          )}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="code" className="block text-sm font-medium text-white/70">
            인증 코드
          </label>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="text-xs text-white/40 hover:text-white/60"
          >
            이메일 변경
          </button>
        </div>
        <p className="text-xs text-white/50">
          <span className="text-white/70">{email}</span>으로 인증 코드를 발송했습니다.
        </p>
        <input
          type="text"
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6자리 숫자"
          required
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder:text-white/30 placeholder:tracking-normal placeholder:text-base focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
            확인 중...
          </span>
        ) : (
          "로그인"
        )}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={loading}
          className="text-sm text-white/40 transition-colors hover:text-white/60 disabled:cursor-not-allowed"
        >
          인증 코드 다시 받기
        </button>
      </div>
    </form>
  );
}

