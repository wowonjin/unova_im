import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 공개된 강좌와 교재 가져오기
  const [courses, textbooks] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.textbook.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/unova-logo.png"
                alt="UNOVA"
                width={140}
                height={28}
                priority
                className="h-6 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="https://unova.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
              >
                유노바 홈페이지
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90 hover:scale-105"
              >
                나의 강의실
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            당신이{" "}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              노바
            </span>
            가 될 수 있도록
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
            가장 실전적인 지식을 제공합니다.<br />
            수능 · 편입 전문 교육 콘텐츠
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-white/90 hover:scale-105"
            >
              강의 시작하기
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>
            <Link
              href="https://unova.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-base font-medium text-white/80 transition-all hover:bg-white/5 hover:border-white/30"
            >
              교재 구매하기
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="school"
              title="전문 강의"
              description="수능 · 편입 전문 선생님들의 체계적인 강의로 효율적인 학습"
            />
            <FeatureCard
              icon="menu_book"
              title="PDF 교재"
              description="구매한 교재를 언제 어디서나 다운로드하여 학습"
            />
            <FeatureCard
              icon="trending_up"
              title="진도 관리"
              description="학습 진도율을 자동으로 기록하고 이어서 학습"
            />
          </div>
        </div>
      </section>

      {/* Courses Section */}
      {courses.length > 0 && (
        <section className="py-20 px-6 border-t border-white/5">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">📚 강의 목록</h2>
                <p className="mt-2 text-white/50">체계적인 커리큘럼으로 학습하세요</p>
              </div>
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
              >
                전체 보기
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  thumbnailUrl={course.thumbnailUrl}
                  lessonCount={course._count.lessons}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Textbooks Section */}
      {textbooks.length > 0 && (
        <section className="py-20 px-6 border-t border-white/5">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">📖 교재 목록</h2>
                <p className="mt-2 text-white/50">PDF로 언제든지 학습하세요</p>
              </div>
              <Link
                href="/materials"
                className="hidden sm:flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
              >
                전체 보기
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {textbooks.map((textbook) => (
                <TextbookCard
                  key={textbook.id}
                  title={textbook.title}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            지금 바로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-white/50">
            유노바 회원이라면 바로 강의를 수강할 수 있습니다
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 text-base font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
            >
              나의 강의실 입장
              <span className="material-symbols-outlined text-[20px]">login</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <Image
                src="/unova-logo.png"
                alt="UNOVA"
                width={120}
                height={24}
                className="h-5 w-auto opacity-60"
              />
              <p className="mt-4 text-sm text-white/40 max-w-md">
                당신이 노바가 될 수 있도록, 가장 실전적인 지식을 제공합니다
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 text-sm">
              <div>
                <p className="font-medium text-white/60 mb-3">서비스</p>
                <ul className="space-y-2 text-white/40">
                  <li>
                    <Link href="https://unova.co.kr" target="_blank" className="hover:text-white/70 transition-colors">
                      교재 구매
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-white/70 transition-colors">
                      나의 강의실
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white/60 mb-3">고객지원</p>
                <ul className="space-y-2 text-white/40">
                  <li>
                    <Link href="/notices" className="hover:text-white/70 transition-colors">
                      공지사항
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:unova.team.cs@gmail.com" className="hover:text-white/70 transition-colors">
                      문의하기
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white/60 mb-3">SNS</p>
                <ul className="space-y-2 text-white/40">
                  <li>
                    <a
                      href="https://www.instagram.com/unova_edu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white/70 transition-colors"
                    >
                      인스타그램
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/@unova_edu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white/70 transition-colors"
                    >
                      유튜브
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-xs text-white/30">
            <p>상호 : 유노바 · 대표 : 장진우 · 사업자등록번호 : 259-40-01233</p>
            <p className="mt-1">소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호</p>
            <p className="mt-1">TEL : 050-6678-6390 · 이메일 : unova.team.cs@gmail.com</p>
            <p className="mt-4">COPYRIGHT 2024. UNOVA. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-white/20">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4">
        <span className="material-symbols-outlined text-[24px] text-blue-400">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

function CourseCard({
  id,
  title,
  thumbnailUrl,
  lessonCount,
}: {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  lessonCount: number;
}) {
  return (
    <Link
      href="/dashboard"
      className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-all hover:bg-white/[0.05] hover:border-white/20 hover:scale-[1.02]"
    >
      <div className="aspect-video relative bg-white/5">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-white/20">play_circle</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-white/90 line-clamp-2 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-white/40">
          {lessonCount}개 강의
        </p>
      </div>
    </Link>
  );
}

function TextbookCard({ title }: { title: string }) {
  return (
    <Link
      href="/materials"
      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.05] hover:border-white/20"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
        <span className="material-symbols-outlined text-[24px] text-orange-400">description</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-white/90 truncate group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-sm text-white/40">PDF 교재</p>
      </div>
      <span className="material-symbols-outlined text-[20px] text-white/30 group-hover:text-white/60 transition-colors">
        chevron_right
      </span>
    </Link>
  );
}
