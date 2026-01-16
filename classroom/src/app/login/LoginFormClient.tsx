"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginFormClient({
  redirectTo,
}: {
  redirectTo: string;
}) {
  const router = useRouter();
  const redirectParam = encodeURIComponent(redirectTo || "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          password: password,
          rememberMe: rememberMe
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          INVALID_EMAIL: "올바른 이메일 주소를 입력해주세요.",
          INVALID_PASSWORD: "비밀번호가 올바르지 않습니다.",
          NOT_REGISTERED: "등록되지 않은 회원입니다. 유노바 홈페이지에서 먼저 회원가입해주세요.",
          NO_MEMBER_INFO: "없는 회원정보입니다. 회원가입 후 이용해주세요.",
          NO_PASSWORD_SET: "비밀번호를 설정하지 않으셨습니다. 임시 비밀번호로 로그인해주세요.",
          SERVER_ERROR: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
        setError((data?.message as string) || errorMessages[data.error] || "오류가 발생했습니다.");
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
    <div className="space-y-4">
      {/* 소셜 로그인 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            window.location.href = `/api/auth/kakao/start?redirect=${redirectParam}`;
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-3 text-[14px] font-semibold text-black transition-all hover:brightness-95"
        >
          <Image src="/social/kakao.svg" alt="" width={22} height={22} />
          카카오로 계속하기
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = `/api/auth/naver/start?redirect=${redirectParam}`;
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-95"
        >
          <Image src="/social/naver.svg" alt="" width={26} height={26} />
          네이버로 계속하기
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <div className="text-[12px] text-white/50">또는</div>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleLogin} className="space-y-0">
        {/* 이메일/비밀번호 입력 필드 (결합된 스타일) */}
        <div className="rounded-xl border border-white/20 overflow-hidden bg-white">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            autoFocus
            className="w-full px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none border-b border-gray-200"
          />
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {/* 로그인 상태 유지 */}
        <div className="flex items-center gap-2 py-3">
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
              rememberMe ? "bg-white border-white text-black" : "border-white/40 text-transparent"
            }`}
          >
            {rememberMe && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[13px] text-white">로그인상태유지</span>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 mb-3">
            {error}
          </div>
        )}

        {/* 로그인 버튼 - 흰색 */}
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full rounded-xl bg-white px-4 py-3 text-[14px] font-semibold text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              로그인 중...
            </span>
          ) : (
            "로그인"
          )}
        </button>
      </form>
    </div>
  );
}
