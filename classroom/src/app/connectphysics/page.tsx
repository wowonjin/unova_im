import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "사이트 기간 만료 | Connect Physics",
  description:
    "현재 접속하신 사이트의 호스팅 기간이 만료되었습니다. 관리자 로그인으로 이용기간을 연장할 수 있습니다.",
};

export default function ConnectPhysicsPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f8] text-[#2a2e36]">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9aa0aa]">
          Connect Physics
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f2329] md:text-4xl">
          사이트 기간 만료
        </h1>
        <p className="mt-6 text-base leading-relaxed text-[#5a606b] md:text-lg">
          현재 접속하신 사이트의 호스팅 기간이 만료되었습니다.
          <br />
          이 사이트 운영자인 경우 아래 관리자 로그인 버튼을 눌러
          이용기간을 연장할 수 있습니다.
        </p>
        <Link
          href="https://imweb.me/admin/login"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-[#2a2e36] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2329]"
        >
          관리자 로그인
        </Link>
      </div>
    </main>
  );
}
