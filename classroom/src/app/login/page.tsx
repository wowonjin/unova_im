import Image from "next/image";
import Link from "next/link";
import LoginFormClient from "./LoginFormClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirect?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const error = sp.error;
  const redirect = sp.redirect || "/dashboard";

  const errorMessages: Record<string, string> = {
    session_expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
    unauthorized: "로그인이 필요합니다.",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 */}
        <div className="flex flex-col items-center">
          <Image
            src="/unova-logo.png"
            alt="UNOVA"
            width={180}
            height={40}
            priority
            className="h-10 w-auto"
          />
          <h1 className="mt-6 text-2xl font-bold text-white">나의 강의실</h1>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {errorMessages[error] || "오류가 발생했습니다."}
          </div>
        )}

        {/* 로그인 폼 */}
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] p-6">
          <LoginFormClient redirectTo={redirect} />
        </div>

        {/* 하단 링크 */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 transition-colors hover:text-white/60"
          >
            둘러보기 (로그인 없이)
          </Link>
        </div>
      </div>
    </div>
  );
}
