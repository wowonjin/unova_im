import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";

const storeHref = `/store?type=${encodeURIComponent("교재")}&exam=${encodeURIComponent("수능")}&subject=${encodeURIComponent("물리학II")}`;

const highlights = [
  "물리학II 핵심 개념과 유형 정리",
  "풀이 접근 방식을 단계별로 학습",
  "기출 기반 문제로 실전 적응",
];

export default function ConnectPhysics2Page() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 pt-[70px]">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: "url(/connect1.png)" }} />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <p className="text-[12px] font-semibold tracking-[0.2em] text-[#6B7FF5]">CONNECT SERIES</p>
              <h1 className="mt-4 text-[28px] md:text-[42px] font-bold leading-tight">CONNECT 물리학II</h1>
              <p className="mt-4 text-[13px] md:text-[15px] text-white/70 leading-relaxed">
                고난도 문항까지 대응할 수 있도록 물리학II를 체계적으로 정리했습니다.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={storeHref}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5b6cff] to-[#8a5bff] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_26px_rgba(91,108,255,0.35)] transition hover:brightness-105"
                >
                  교재 구매하기
                </Link>
                <Link href="/connect-textbook" className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-[14px] font-semibold text-white/80 hover:text-white">
                  CONNECT 메인으로
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-[22px] md:text-[28px] font-semibold">이 교재가 필요한 학생</h2>
                <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
                  물리학II의 난이도 높은 문항을 단계적으로 연습하고 싶은 학생에게 추천합니다.
                </p>
              </div>
              <ul className="space-y-3 text-[13px] md:text-[14px] text-white/70">
                {highlights.map((item) => (
                  <li key={item} className="rounded-xl bg-white/[0.05] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
