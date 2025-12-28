"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";

interface Teacher {
  id: string;
  name: string;
  subject: string;
  subjectColor: string;
  bgColor: string;
  tagline: string;
  description: string;
  image: string | null;
  stats: {
    students: string;
    courses: number;
    rating: number;
  };
  tags: string[];
}

const teachers: Teacher[] = [
  {
    id: "lee-sangyeob",
    name: "이상엽",
    subject: "국어",
    subjectColor: "text-rose-500",
    bgColor: "bg-rose-500",
    tagline: "수능 국어의 본질을 꿰뚫는 명강의",
    description: "문학과 비문학의 핵심을 정확히 짚어내는 체계적인 강의",
    image: "/teachers/lee-sangyeob.jpg",
    stats: { students: "1.2만+", courses: 8, rating: 4.9 },
    tags: ["문학", "비문학", "화법과작문"],
  },
  {
    id: "baek-hawook",
    name: "백하욱",
    subject: "수학",
    subjectColor: "text-blue-500",
    bgColor: "bg-blue-500",
    tagline: "연세대 의대 출신 수학 전문가",
    description: "수학적 사고력을 키우는 원리 중심 강의",
    image: "/teachers/baek-hawook.jpg",
    stats: { students: "2.5만+", courses: 12, rating: 4.95 },
    tags: ["수학I", "수학II", "미적분"],
  },
  {
    id: "yoo-yerin",
    name: "유예린",
    subject: "영어",
    subjectColor: "text-emerald-500",
    bgColor: "bg-emerald-500",
    tagline: "영어의 구조를 완벽하게 이해하는 방법",
    description: "독해, 듣기, 문법을 아우르는 통합적 학습법",
    image: "/teachers/yoo-yerin.jpg",
    stats: { students: "8,500+", courses: 6, rating: 4.85 },
    tags: ["독해", "듣기", "문법"],
  },
  {
    id: "jang-jinwoo",
    name: "장진우",
    subject: "물리",
    subjectColor: "text-amber-500",
    bgColor: "bg-amber-500",
    tagline: "물리학의 원리를 직관적으로 설명",
    description: "복잡한 물리 개념을 쉽고 명확하게 전달",
    image: "/teachers/jang-jinwoo.jpg",
    stats: { students: "1.8만+", courses: 10, rating: 4.92 },
    tags: ["물리학I", "물리학II", "역학"],
  },
  {
    id: "study-crack",
    name: "Study Crack",
    subject: "컨설팅",
    subjectColor: "text-violet-500",
    bgColor: "bg-violet-500",
    tagline: "맞춤형 입시 전략 컨설팅",
    description: "학생 개개인에 맞는 최적의 입시 전략 수립",
    image: "/teachers/study-crack.jpg",
    stats: { students: "3,200+", courses: 4, rating: 4.88 },
    tags: ["정시전략", "수시전략", "편입상담"],
  },
];

const subjects = ["전체", "국어", "수학", "영어", "물리", "컨설팅"];

export default function TeachersPage() {
  const [selectedSubject, setSelectedSubject] = useState("전체");

  const filteredTeachers = selectedSubject === "전체"
    ? teachers
    : teachers.filter((t) => t.subject === selectedSubject);

  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 pt-[70px]">
        {/* 헤더 섹션 */}
        <section className="py-10 md:py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em]">
              유노바 선생님
            </h1>
            <p className="mt-3 text-[15px] md:text-[16px] text-white/50">
              최고의 강사진이 여러분의 성장을 함께합니다
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/teachers/${teacher.id}`}
                  className="group block rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden transition-all hover:bg-white/[0.05] hover:border-white/[0.1]"
                >
                  {/* 프로필 영역 */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* 프로필 이미지 */}
                      <div className={`w-14 h-14 rounded-xl ${teacher.bgColor} flex items-center justify-center shrink-0 overflow-hidden`}>
                        {teacher.image ? (
                          <Image
                            src={teacher.image}
                            alt={teacher.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[20px] font-bold text-white">
                            {teacher.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* 이름 & 과목 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[17px] font-semibold text-white">
                            {teacher.name}
                          </h3>
                          <span className="text-[12px] font-medium text-white">
                            {teacher.subject}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] text-white/50 line-clamp-1">
                          {teacher.tagline}
                        </p>
                      </div>
                    </div>

                    {/* 통계 */}
                    <div className="mt-4 flex items-center gap-4 text-[12px] text-white/40">
                      <span>수강생 {teacher.stats.students}</span>
                      <span>강좌 {teacher.stats.courses}개</span>
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {teacher.stats.rating}
                      </span>
                    </div>

                    {/* 태그 */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {teacher.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[11px] bg-white/[0.06] text-white/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 하단 */}
                  <div className="px-5 pb-5 pt-2 flex items-center justify-between">
                    <span className="text-[12px] text-white/40">프로필 보기</span>
                    <svg 
                      className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors"
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {/* 결과 없음 */}
            {filteredTeachers.length === 0 && (
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
