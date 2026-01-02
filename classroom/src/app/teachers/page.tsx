"use client";

import Link from "next/link";
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
  // 요청: 과목명은 회색 컨테이너에 검정 글씨로 통일
  void subjectName;
  return "bg-neutral-200 text-black border-black/10";
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
        const res = await fetch("/api/teachers/list", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error("FETCH_FAILED");
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
      
      <main className="flex-1 pt-[70px]">
        {/* 헤더 섹션 */}
        <section className="py-10 md:py-12">
          <div className="mx-auto max-w-6xl px-4 text-left md:text-center">
            <h1 className="text-[22px] md:text-[40px] font-bold tracking-[-0.02em]">
              유노바 선생님
            </h1>
            <p className="mt-2 text-[13px] md:mt-3 md:text-[16px] text-white/55 md:text-white/50">
              문제풀이 실력으로 검증된 유노바 선생님과 함께하세요.
            </p>
          </div>
        </section>

        {/* 과목 필터 */}
        <section className="sticky top-[70px] z-40 bg-[#161616]">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-1 py-4 overflow-x-auto scrollbar-hide">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all whitespace-nowrap ${
                    selectedSubject === subject
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {subject}
                </button>
              ))}
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={teacher.imageUrl}
                        alt={teacher.name}
                        className="w-full h-auto"
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
                          className={`inline-flex items-center px-2 py-1 sm:px-2.5 rounded-full text-[11px] sm:text-[12px] border shrink-0 ${subjectBadgeClass(
                            teacher.subjectName
                          )}`}
                        >
                          {teacher.subjectName}
                        </span>
                        <h3 className="text-[16px] sm:text-[18px] font-semibold text-white truncate">{teacher.name} 선생님</h3>
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
