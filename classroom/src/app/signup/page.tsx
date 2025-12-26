import Link from "next/link";
import SignupFormClient from "./SignupFormClient";
import LandingHeader from "../_components/LandingHeader";
import FloatingKakaoButton from "../_components/FloatingKakaoButton";

export default function SignupPage() {
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
