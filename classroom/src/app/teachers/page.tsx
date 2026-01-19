"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";

type Teacher = {
  slug: string;
  name: string;
  subjectName: string;
  imageUrl: string | null;
  position?: number;
};

function subjectBadgeClass(subjectName: string): string {
  // 과목 배지: 흰색 배경 + 검정 글씨로 통일
  void subjectName;
  return "bg-white text-black border-white/20";
}

export default function TeachersPage() {
  const [selectedSubject, setSelectedSubject] = useState("전체");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subjects = useMemo(() => {
    // 과목 탭 정렬: "각 과목에 속한 선생님 중 최소 position" 기준(오름차순)
    // position=0(미설정)은 맨 뒤로 처리
    const subjectToMinPos = new Map<string, number>();

    for (const t of teachers) {
      const subject = (t.subjectName || "").trim();
      if (!subject) continue;
      const rawPos = typeof t.position === "number" && Number.isFinite(t.position) ? t.position : 0;
      const pos = rawPos === 0 ? Number.MAX_SAFE_INTEGER : rawPos;
      const prev = subjectToMinPos.get(subject);
      if (prev === undefined || pos < prev) subjectToMinPos.set(subject, pos);
    }

    const list = Array.from(subjectToMinPos.entries());
    list.sort((a, b) => (a[1] - b[1]) || a[0].localeCompare(b[0], "ko"));
    return ["전체", ...list.map(([subject]) => subject)];
  }, [teachers]);

  const filteredTeachers =
    selectedSubject === "전체" ? teachers : teachers.filter((t) => (t.subjectName || "").trim() === selectedSubject);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const teachersRes = await fetch("/api/teachers/list");

        const json = await teachersRes.json().catch(() => null);
        if (!teachersRes.ok || !json?.ok) throw new Error("FETCH_FAILED");
        const list: Teacher[] = Array.isArray(json.teachers) ? json.teachers : [];
        // position 필드는 선택(optional)이라, 누락되어도 동작하도록 안전 보정
        const normalized = list.map((t) => ({
          ...t,
          position: typeof (t as any)?.position === "number" ? (t as any).position : 0,
        }));
        setTeachers(normalized);
      } catch {
        setTeachers([]);
        setError("선생님 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader backgroundColor="#161616" />
      
      <main className="flex-1 pt-[50px] lg:pt-[70px]">
        {/* 헤더 섹션 */}
        <section className="py-6 md:py-12">
          <div className="mx-auto max-w-6xl px-4 text-left md:text-center">
            <h1 className="text-[22px] md:text-[40px] font-bold tracking-[-0.02em]">
              유노바 선생님
            </h1>
            <p className="mt-1 text-[13px] md:mt-3 md:text-[16px] text-white/55 md:text-white/50">
              문제풀이 실력으로 검증된 유노바 선생님과 함께하세요.
            </p>
          </div>
        </section>

        {/* 과목 필터 */}
        <section className="sticky top-[50px] lg:top-[70px] z-40 bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4">
            {/* 탭바(가로 스크롤 + 활성 밑줄) */}
            <div className="-mx-4 px-4">
              <div
                className="flex gap-4 md:gap-6 overflow-x-auto border-b border-white/10 pb-2 md:pb-3 scrollbar-hide"
                role="tablist"
                aria-label="과목 선택"
              >
                {subjects.map((subject) => {
                  const active = selectedSubject === subject;
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSelectedSubject(subject)}
                      role="tab"
                      aria-selected={active}
                      className={`relative shrink-0 px-1 py-2 md:py-3 text-[13px] md:text-[15px] font-semibold transition-colors ${
                        active ? "text-white" : "text-white/55 hover:text-white/80"
                      }`}
                    >
                      {subject}
                      {active ? (
                        <span
                          className="absolute left-0 right-0 -bottom-2 md:-bottom-3 h-[2px] rounded-full bg-white"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 강사 목록 */}
        <section className="pt-2 pb-24">
          <div className="mx-auto max-w-6xl px-4">
            {error && (
              <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-white/50">불러오는 중...</div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredTeachers.map((teacher) => (
                  <Link
                    key={teacher.slug}
                    href={`/teachers/${teacher.slug}`}
                    className="group block bg-transparent border border-transparent overflow-hidden transition-all"
                  >
                    {/* 이미지(컨테이너 없이 이미지 자체) */}
                    {teacher.imageUrl ? (
                      <Image
                        src={teacher.imageUrl}
                        alt={teacher.name}
                        width={600}
                        height={800}
                        className="w-full h-auto"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full flex items-center justify-center bg-white/[0.04] py-12">
                        <span className="text-[56px] font-bold text-white/70">{teacher.name.charAt(0)}</span>
                      </div>
                    )}

                    {/* 이름 / 과목 */}
                    <div className="p-3 sm:p-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 sm:px-2.5 rounded-full text-[10px] sm:text-[12px] border shrink-0 ${subjectBadgeClass(
                            teacher.subjectName
                          )}`}
                        >
                          {teacher.subjectName}
                        </span>
                        <h3 className="text-[14px] sm:text-[18px] font-semibold text-white truncate">{teacher.name} 선생님</h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 결과 없음 */}
            {!loading && filteredTeachers.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-[16px] text-white/40">
                  해당 과목의 선생님이 없습니다
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
