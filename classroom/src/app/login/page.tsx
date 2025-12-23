import Image from "next/image";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirect?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const error = sp.error;
  const redirect = sp.redirect || "/dashboard";

  const errorMessages: Record<string, string> = {
    missing_params: "필수 정보가 누락되었습니다.",
    expired: "로그인 링크가 만료되었습니다. 다시 시도해주세요.",
    invalid_signature: "유효하지 않은 로그인 요청입니다.",
    config: "서버 설정 오류가 발생했습니다.",
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
          <p className="mt-2 text-center text-white/60">
            유노바 사이트에서 로그인 후 이용해주세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {errorMessages[error] || "로그인 중 오류가 발생했습니다."}
          </div>
        )}

        {/* 안내 카드 */}
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] p-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <span
                className="material-symbols-outlined text-white/70"
                style={{ fontSize: "32px" }}
              >
                login
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">로그인 방법</h2>
              <p className="text-sm text-white/60">
                유노바 사이트(unova.co.kr)에서 로그인하신 후,
                <br />
                &quot;나의 강의실&quot; 버튼을 클릭하시면
                <br />
                자동으로 로그인됩니다.
              </p>
            </div>

            <a
              href="https://unova.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                open_in_new
              </span>
              유노바 사이트로 이동
            </a>
          </div>
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

