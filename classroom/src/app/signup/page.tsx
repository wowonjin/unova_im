import Link from "next/link";
import SignupFormClient from "./SignupFormClient";
import LandingHeader from "../_components/LandingHeader";
import FloatingKakaoButton from "../_components/FloatingKakaoButton";
import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ social?: string; redirect?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const social = (sp.social || "").toLowerCase();
  const redirectTo = sp.redirect || "/";

  // 로그인 페이지에서 "카카오/네이버 회원가입"을 눌러 들어온 경우
  // 회원가입 페이지에서 곧바로 OAuth 시작 라우트로 이동시켜준다.
  if (social === "kakao" || social === "naver") {
    redirect(`/api/auth/${social}/start?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <div className="min-h-screen bg-[#161616] text-white">
      {/* 헤더 */}
      <LandingHeader />

      {/* 카카오 문의 버튼 */}
      <FloatingKakaoButton />

      {/* 메인 컨텐츠 - 가운데 정렬 */}
      <div className="flex min-h-screen items-center justify-center pt-[70px] px-4 py-12">
        <div className="w-full max-w-[380px]">
          {/* 제목 */}
          <h1 className="text-[32px] font-bold text-white text-center mb-8">회원가입</h1>

          {/* 회원가입 폼 (소셜 버튼 + 이메일 폼 통합) */}
          <SignupFormClient />

          {/* 하단 링크 */}
          <div className="mt-6 text-center">
            <p className="text-[13px] text-white/50">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-white hover:underline">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
