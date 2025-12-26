import Link from "next/link";
import Image from "next/image";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";

const teachers = [
  {
    id: "lee-sangyeob",
    name: "이상엽",
    subject: "국어",
    subjectColor: "text-rose-400",
    bgColor: "bg-rose-500/10",
    description: "수능 국어의 본질을 꿰뚫는 명강의",
    image: "/teachers/lee-sangyeob.jpg",
  },
  {
    id: "baek-hawook",
    name: "백하욱",
    subject: "수학",
    subjectColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    description: "연세대학교 의과대학 출신 수학 전문가",
    image: "/teachers/baek-hawook.jpg",
  },
  {
    id: "yoo-yerin",
    name: "유예린",
    subject: "영어",
    subjectColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    description: "영어의 구조를 완벽하게 이해하는 방법",
    image: "/teachers/yoo-yerin.jpg",
  },
  {
    id: "jang-jinwoo",
    name: "장진우",
    subject: "물리",
    subjectColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    description: "물리학의 원리를 직관적으로 설명하는 강의",
    image: "/teachers/jang-jinwoo.jpg",
  },
  {
    id: "study-crack",
    name: "Study Crack",
    subject: "컨설팅",
    subjectColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    description: "맞춤형 입시 전략 컨설팅",
    image: "/teachers/study-crack.jpg",
  },
];

export default function TeachersPage() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 pt-[70px]">
        {/* 히어로 */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-0.02em] leading-[1.1]">
              유노바 선생님
            </h1>
            <p className="mt-5 text-[17px] md:text-[19px] text-white/50 leading-relaxed">
              최고의 강사진이 여러분의 성장을 함께합니다
            </p>
          </div>
        </section>

        {/* 선생님 목록 */}
        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/teachers/${teacher.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] transition-all hover:bg-white/[0.05] hover:border-white/[0.1]"
                >
                  {/* 이미지 영역 */}
                  <div className="aspect-[4/3] relative bg-white/[0.02] overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-20 h-20 rounded-full ${teacher.bgColor} flex items-center justify-center`}>
                        <span className={`text-2xl font-bold ${teacher.subjectColor}`}>
                          {teacher.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 정보 영역 */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[13px] font-medium ${teacher.subjectColor}`}>
                        {teacher.subject}
                      </span>
                    </div>
                    <h3 className="text-[20px] font-semibold text-white group-hover:text-white/90">
                      {teacher.name} 선생님
                    </h3>
                    <p className="mt-2 text-[14px] text-white/50 leading-relaxed">
                      {teacher.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

