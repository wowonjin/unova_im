import Image from "next/image";
import Link from "next/link";
import LoginFormClient from "./LoginFormClient";
import LandingHeader from "../_components/LandingHeader";
import FloatingKakaoButton from "../_components/FloatingKakaoButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirect?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const error = sp.error;
  const redirect = sp.redirect || "/";

  const errorMessages: Record<string, string> = {
    session_expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
    unauthorized: "로그인이 필요합니다.",
    oauth_not_configured: "소셜 로그인 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.",
    oauth_failed: "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
    oauth_missing_code: "소셜 로그인 응답이 올바르지 않습니다. 다시 시도해주세요.",
    oauth_state_mismatch: "보안 검증에 실패했습니다. 다시 시도해주세요.",
    oauth_server_error: "소셜 로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  };

  return (
    <div className="min-h-screen bg-[#161616] text-white">
      {/* 헤더 */}
      <LandingHeader />

      {/* 카카오 문의 버튼 */}
      <FloatingKakaoButton />

      {/* 메인 컨텐츠 - 가운데 정렬 */}
      <div className="flex min-h-screen items-center justify-center pt-[70px] px-4">
        <div className="w-full max-w-[340px]">
          {/* 제목 */}
          <h1 className="text-[32px] font-bold text-white text-center mb-8">로그인</h1>

        {/* 에러 메시지 */}
        {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {errorMessages[error] || "오류가 발생했습니다."}
          </div>
        )}

          {/* 소셜 로그인 버튼 */}
          <div className="space-y-2.5 mb-6">
            {/* 카카오 회원가입 */}
            <a
              href={`/api/auth/kakao/start?redirect=${encodeURIComponent(redirect)}`}
              className="relative flex items-center justify-center w-full rounded-xl bg-[#FEE500] px-4 py-3 text-[14px] font-semibold text-black transition-all hover:brightness-95"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 256 256" 
                className="absolute left-4"
              >
                <path 
                  fill="#000000" 
                  d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.344-10.581 37.689 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.943-24.811 43.944-29.03 5.995.849 12.168 1.28 18.472 1.28 57.438 0 104-36.712 104-82 0-45.287-46.562-82-104-82z"
                />
              </svg>
              카카오 로그인
            </a>

            {/* 네이버 회원가입 */}
            <a
              href={`/api/auth/naver/start?redirect=${encodeURIComponent(redirect)}`}
              className="relative flex items-center justify-center w-full rounded-xl bg-[#03C75A] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-95"
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 20 20" 
                className="absolute left-4"
              >
                <path 
                  fill="#FFFFFF" 
                  d="M13.5 10.5L6.2 0H0v20h6.5V9.5L13.8 20H20V0h-6.5v10.5z"
                />
              </svg>
              네이버 로그인
            </a>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="text-[13px] text-white">또는</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          {/* 이메일 로그인 폼 */}
          <LoginFormClient redirectTo={redirect} />

        {/* 하단 링크 */}
          <div className="flex items-center justify-between mt-5 text-[13px]">
          <Link
              href={`/signup?redirect=${encodeURIComponent(redirect)}`}
              className="text-white hover:text-white/80 transition-colors"
          >
              회원가입
          </Link>
            <a
              href="https://unova.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-white/80 transition-colors"
            >
              아이디 · 비밀번호 찾기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
