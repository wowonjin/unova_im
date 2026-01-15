import Link from "next/link";
import LoginFormClient from "./LoginFormClient";
import LandingHeader from "../_components/LandingHeader";

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
