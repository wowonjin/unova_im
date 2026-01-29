import Image from "next/image";
import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";

const stats = [
  { title: "한 달 안에 완강률", value: "95%" },
  { title: "다른 커넥트 교재 구매율", value: "70%" },
  { title: "작년 대비 인스타그램 팔로워", value: "10배" },
];

const testimonials = [
  {
    title: "수학 4등급에서 수능 1등급\n유노바 교재 덕분입니다.",
    body:
      "늘 수학은 4등급에서 벗어나지 못해 스트레스였습니다. 인스타에서 우연히 유노바 교재를 알게 되어 반신반의하며 시작했는데, 개념설명부터 스킬까지 빈틈없이 구성되어 있었습니다. 매일 꾸준히 공부했더니 실력이 확실히 늘었습니다.",
    foot: "2024년 수학 교재 구매 학생",
  },
  {
    title: "막막했던 물리 덕분에 완벽하게\n이해했습니다.",
    body:
      "제가 예전부터 물리를 공부를 오래하긴 했는데, 막상 문제풀이를 하면 풀어나가질 못했습니다. 설명이 너무 자세하고 친절해서 이해가 빨랐습니다. 문제에 접근하는 감이 생기면서 자신감이 생겼습니다.",
    foot: "2024년 물리 교재 구매 학생",
  },
  {
    title: "가뭄과 같은 물리2 기본 교재에\n감사합니다.",
    body:
      "시중에 물리2 교재는 너무 거칠거나 너무 교재에 비해 기본 설명이 부족했는데 유노바 물리2 교재는 기본기를 탄탄하게 잡아주면서 유형별로 체계적으로 분석되어 있어서 큰 도움이 됐습니다. 좋은 책 감사합니다.",
    foot: "2024년 물리2 교재 구매 학생",
  },
];

const connectSeries = [
  {
    title: "CONNECT 수능 수학",
    description: "수능과 평가원 기출 기반으로 개념과 실전 스킬을 정리한 수학 교재.",
    href: "/connect-textbook/suneung-math",
    storeHref: `/store?type=${encodeURIComponent("교재")}&exam=${encodeURIComponent("수능")}&subject=${encodeURIComponent("수학")}`,
  },
  {
    title: "CONNECT 내신 수학",
    description: "학교 내신 대비를 위한 핵심 개념 정리와 유형별 풀이 전략.",
    href: "/connect-textbook/naesin-math",
    storeHref: `/store?type=${encodeURIComponent("교재")}&exam=${encodeURIComponent("내신")}&subject=${encodeURIComponent("수학")}`,
  },
  {
    title: "CONNECT 물리학I",
    description: "물리학I 전 범위를 빠르게 정리하는 실전형 교재.",
    href: "/connect-textbook/physics-1",
    storeHref: `/store?type=${encodeURIComponent("교재")}&exam=${encodeURIComponent("수능")}&subject=${encodeURIComponent("물리학I")}`,
  },
  {
    title: "CONNECT 물리학II",
    description: "물리학II 핵심 개념부터 기출 기반 응용까지 압축 정리.",
    href: "/connect-textbook/physics-2",
    storeHref: `/store?type=${encodeURIComponent("교재")}&exam=${encodeURIComponent("수능")}&subject=${encodeURIComponent("물리학II")}`,
  },
];

export default function ConnectTextbookPage() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 pt-[70px]">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: "url(/connect1.png)" }}
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <span className="material-symbols-outlined text-[20px] text-white/90">menu_book</span>
              </div>
              <h1 className="mt-5 text-[26px] md:text-[40px] font-bold tracking-[-0.03em] leading-tight">
                최상위권 선생님들의 노하우를
                <br className="hidden md:block" />
                책 한 권에 담았습니다
              </h1>
              <p className="mt-4 text-[13px] md:text-[15px] text-white/70 leading-relaxed">
                핵심 개념부터 기출 기반 스킬, 평가원 분석까지
                <br className="hidden md:block" />
                모든 것을 한 번에, 빠르게 마스터 해보세요
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/store?type=${encodeURIComponent("교재")}`}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5b6cff] to-[#8a5bff] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_26px_rgba(91,108,255,0.35)] transition hover:brightness-105"
                >
                  교재 구매하기
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="text-center">
              <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">CONNECT</p>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-bold">CONNECT 교재 라인업</h2>
              <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
                목적에 맞는 교재 페이지로 이동해 상세 정보를 확인하세요.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {connectSeries.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-7">
                  <h3 className="text-[18px] md:text-[20px] font-semibold">{item.title}</h3>
                  <p className="mt-3 text-[13px] md:text-[14px] text-white/60 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={item.href}
                      className="inline-flex items-center justify-center rounded-full bg-white text-black px-4 py-2 text-[12px] font-semibold"
                    >
                      상세 보기
                    </Link>
                    <Link
                      href={item.storeHref}
                      className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-[12px] font-semibold text-white/80 hover:text-white"
                    >
                      교재 바로가기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="text-center">
              <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">EDITOR</p>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-bold">선생님 소개</h2>
              <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
                유노바 교재는 각 분야 최고 전문가들의 엄격한 검수를 거쳐 완성됩니다.
                <br className="hidden md:block" />
                개념과 풀이에 대한 깊이 있는 분석과 체계적 접근으로 차별화된 품질을 제공합니다.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#2E2E2E] p-6 md:p-7">
                <h3 className="text-[16px] md:text-[18px] font-semibold">장진우 선생님</h3>
                <ul className="mt-4 space-y-2 text-[13px] text-white/65">
                  <li>· 前 연세대학교 천문우주학과</li>
                  <li>· 前 대치 명인 학원</li>
                  <li>· 前 대치 상상 학원</li>
                  <li>· 前 메가스터디 학원</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-[#2E2E2E] p-6 md:p-7">
                <h3 className="text-[16px] md:text-[18px] font-semibold">백하욱 선생님</h3>
                <ul className="mt-4 space-y-2 text-[13px] text-white/65">
                  <li>· 現 연세대학교 의과대학</li>
                  <li>· 前 영재학교대구과학고 졸업</li>
                  <li>· 前 수능 국어 100점 (언매 선택)</li>
                  <li>· 前 수능 수학 100점 (미적분 선택)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#171739]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <span className="material-symbols-outlined text-[22px] text-white/80">stars</span>
              </div>
              <h2 className="mt-4 text-[22px] md:text-[28px] font-semibold">이유 있는 선택,</h2>
              <h3 className="text-[22px] md:text-[28px] font-semibold">그 결과로 증명합니다.</h3>
              <p className="mt-3 text-[13px] md:text-[14px] text-white/65">
                총 만족도 4.5점, 5000명 이상의 학생들의 성적을 변화시켰습니다.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {stats.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center">
                  <p className="text-[13px] text-white/70">{item.title}</p>
                  <p className="mt-2 text-[32px] md:text-[36px] font-bold text-[#b54b4b]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.title} className="rounded-2xl bg-[#26284a] p-6 md:p-7">
                  <div className="flex items-center gap-1 text-[#ff6b6b]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span key={idx}>★</span>
                    ))}
                  </div>
                  <h4 className="mt-4 whitespace-pre-line text-[15px] font-semibold leading-relaxed text-white">
                    {t.title}
                  </h4>
                  <p className="mt-4 text-[13px] leading-relaxed text-white/65">{t.body}</p>
                  <p className="mt-6 text-[12px] text-white/45">{t.foot}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="bg-white">
            <p className="mx-auto max-w-6xl px-4 py-2 text-center text-[12px] md:text-[13px] font-semibold tracking-[0.08em] text-black">
              PART 1. CONNECT Series 교재 구성
            </p>
          </div>
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">POINT 1</p>
            <h2 className="mt-3 text-[26px] md:text-[34px] font-bold">교재 표지와 목차</h2>
            <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
              수능과 평가원에 나오는 모든 목차를 담았습니다.
            </p>

            <div className="mt-10 grid items-end gap-0 md:grid-cols-2">
              <div className="mx-auto w-full max-w-[620px]">
                <div className="relative h-[720px] w-full">
                  <Image
                    src="/book1.png"
                    alt="CONNECT 교재 표지"
                    fill
                    sizes="(min-width: 768px) 620px, 96vw"
                    className="object-contain object-bottom"
                  />
                </div>
              </div>
              <div className="mx-auto w-full max-w-[620px]">
                <div className="relative h-[720px] w-full">
                  <Image
                    src="/book2.png"
                    alt="CONNECT 교재 목차"
                    fill
                    sizes="(min-width: 768px) 620px, 96vw"
                    className="object-contain object-bottom"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">POINT 2</p>
            <h2 className="mt-3 text-[26px] md:text-[34px] font-bold">개념편 구성</h2>
            <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
              수능에 출제되는 공식만 확실하게, 그리고 간단한 예제에 적용까지.
            </p>

            <div className="mt-10 grid items-end gap-4 md:grid-cols-2">
              <div className="mx-auto w-full max-w-[620px]">
                <div className="relative h-[720px] w-full">
                  <Image
                    src="/book3.png"
                    alt="CONNECT 개념편 구성 예시 1"
                    fill
                    sizes="(min-width: 768px) 620px, 96vw"
                    className="object-contain object-bottom scale-[1.06]"
                  />
                </div>
              </div>
              <div className="mx-auto w-full max-w-[620px]">
                <div className="relative h-[720px] w-full">
                  <Image
                    src="/book4.png"
                    alt="CONNECT 개념편 구성 예시 2"
                    fill
                    sizes="(min-width: 768px) 620px, 96vw"
                    className="object-contain object-bottom scale-[0.98]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">POINT 3</p>
            <h2 className="mt-3 text-[26px] md:text-[34px] font-bold">평가원 문제 및 해설편 구성</h2>
            <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
              과목별 전문가가 작성한 기출 분석의 모든 것을 한 눈에 확인하기.
            </p>

            <div className="mt-10">
              <div className="mx-auto w-full max-w-[760px]">
                <div className="relative h-[720px] w-full">
                  <Image
                    src="/book5.png"
                    alt="CONNECT 평가원 문제 및 해설편 예시"
                    fill
                    sizes="(min-width: 768px) 760px, 96vw"
                    className="object-contain object-bottom"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="bg-white">
            <p className="mx-auto max-w-6xl px-4 py-2 text-center text-[12px] md:text-[13px] font-semibold tracking-[0.08em] text-black">
              PART 2. 수능 공부 핵심 정리
            </p>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">POINT 1</p>
            <h2 className="mt-3 text-[24px] md:text-[34px] font-bold">수능 독학은 시간이 정말 많이 걸립니다..</h2>
            <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
              수능 공부를 처음 시작하면, 실제 시험에 거의 나오지 않는 기초 개념 암기에 시간을 쓰기 쉽습니다.
              <br className="hidden md:block" />
              하지만 빠르게 성적을 올리려면 기출 문제를 기반으로 한 &quot;실전 개념&quot;에 집중해야 합니다.
            </p>
            <div className="mt-10 mx-auto w-full max-w-[980px]">
              <div className="relative h-[360px] w-full md:h-[420px]">
                <Image
                  src="/point1.png"
                  alt="수능 공부 핵심 정리 흐름"
                  fill
                  sizes="(min-width: 768px) 980px, 96vw"
                  className="object-cover object-bottom"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
              <Image src="/point6.png" alt="" width={24} height={24} className="h-6 w-6 opacity-80" />
            </div>
            <h2 className="mt-5 text-[22px] md:text-[30px] font-bold">
              실전 개념과 해석법을 배운 후 (A)
              <br className="hidden md:block" />
              양치기로 계산력을 늘려보세요 (B)
            </h2>
            <div className="mt-10 mx-auto w-full max-w-[820px]">
              <Image
                src="/point2.png"
                alt="실전 개념과 해석법을 적용한 변화"
                width={1640}
                height={1200}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <p className="text-[12px] md:text-[13px] font-semibold tracking-[0.2em] text-[#6B7FF5]">POINT 2</p>
            <h2 className="mt-3 text-[24px] md:text-[34px] font-bold">평가원 문항을 완벽하게 정복해야 합니다.</h2>
            <p className="mt-4 text-[13px] md:text-[15px] text-white/60 leading-relaxed">
              수능에서 출제되는 문항과 평가원 문항은 유형과 형태에 대해 매우 높은 연계성을 가지고 있습니다.
              <br className="hidden md:block" />
              따라서 수능에서 빠르게 고득점을 얻고 싶다면 평가원 문항을 우선적으로 공부해야 합니다.
            </p>
            <div className="mt-10 mx-auto w-full max-w-[980px]">
              <div className="relative h-[360px] w-full md:h-[420px]">
                <Image
                  src="/point3.png"
                  alt="평가원 문항과 수능 문항 비교"
                  fill
                  sizes="(min-width: 768px) 980px, 96vw"
                  className="object-cover object-bottom"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
              <Image src="/point6.png" alt="" width={24} height={24} className="h-6 w-6 opacity-80" />
            </div>
            <h2 className="mt-5 text-[22px] md:text-[30px] font-bold">
              평가원 문제를 신속하게 정복하여
              <br className="hidden md:block" />
              1등급 진입 전 구간을 빠르게 돌파합니다
            </h2>
            <div className="mt-10 mx-auto w-full max-w-[980px]">
              <Image
                src="/point4.png"
                alt="평가원 문항 학습 효과"
                width={1960}
                height={1200}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
              <Image src="/point6.png" alt="" width={24} height={24} className="h-6 w-6 opacity-80" />
            </div>
            <h2 className="mt-5 text-[22px] md:text-[30px] font-bold">무작정 문제만 풀어서는 점수가 오르지 않습니다</h2>
            <p className="mt-4 text-[13px] md:text-[15px] text-white/60">
              모든 파트가 <span className="text-white font-semibold">유기적으로 연결</span>되어야 합니다
            </p>
            <div className="mt-10 mx-auto w-full max-w-[820px]">
              <Image
                src="/point7.png"
                alt="무의미한 양치기와 연결되지 않는 풀이"
                width={1640}
                height={420}
                className="h-auto w-full"
              />
            </div>
            <div className="mt-10 mx-auto w-full max-w-[980px]">
              <Image
                src="/point5.png"
                alt="유형별 스킬 정리와 알고리즘 해설"
                width={1960}
                height={1200}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
