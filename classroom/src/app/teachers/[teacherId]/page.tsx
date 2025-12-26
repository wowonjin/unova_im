import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { notFound } from "next/navigation";
import TeacherDetailClient from "./TeacherDetailClient";
import type { TeacherDetailTeacher } from "./TeacherDetailClient";

type Banner = {
  topText: string;
  title: string;
  isNew?: boolean;
  type: 'banner1' | 'banner2';
};

type Review = {
  text: string;
  rating: number;
};

type Notice = {
  tag: 'book' | 'event' | 'notice';
  text: string;
};

type FloatingBanner = {
  sub: string;
  title: string;
  desc: string;
  gradient: 'box1' | 'box2';
};

type ProfileSection = {
  title: string;
  content: string | string[];
};

type CurriculumSlide = {
  title: string;
  sub?: string;
  images: string[];
};

type Book = {
  title: string;
  sub: string;
  href: string;
  cover: string;
};

type BookSet = {
  id: string;
  label: string;
  books: Book[];
};

type Lecture = {
  title: string;
  thumbnail: string;
  href: string;
  accent?: string;
};

type LectureSet = {
  id: string;
  label: string;
  lectures: Lecture[];
};

type YoutubeVideo = {
  url: string;
};

type FAQItem = {
  label: string;
  labelColor: 'blue' | 'purple' | 'orange';
  question: string;
  answer: React.ReactNode;
};

type TeacherData = {
  name: string;
  subject: string;
  subjectColor: string;
  bgColor: string;
  university?: string;
  description: string;
  longDescription: string;
  achievements: string[];
  courses: { title: string; price: string; href: string }[];
  socialLinks?: { type: 'instagram' | 'youtube'; url: string; icon: string }[];
  // 새로운 필드들
  headerSub?: string;
  imageUrl?: string;
  banners?: Banner[];
  reviews?: Review[];
  notices?: Notice[];
  floatingBanners?: FloatingBanner[];
  curriculum?: CurriculumSlide[];
  bookSets?: BookSet[];
  lectureSets?: LectureSet[];
  curriculumLink?: string;
  youtubeVideos?: YoutubeVideo[];
  faqItems?: FAQItem[];
  profile?: {
    education: ProfileSection;
    career: ProfileSection;
    gradeImprovements?: ProfileSection;
    mockTestImprovements?: ProfileSection;
  };
  navigationLinks?: {
    curriculum?: string;
    lecture?: string;
    book?: string;
    board?: string;
  };
};

const teachersData: Record<string, TeacherData> = {
  "lee-sangyeob": {
    name: "이상엽",
    subject: "국어",
    subjectColor: "text-rose-400",
    bgColor: "bg-rose-500/10",
    description: "수능 국어의 본질을 꿰뚫는 명강의",
    longDescription: "국어 영역의 핵심을 정확히 짚어주는 강의로 많은 학생들의 성적 향상을 이끌어낸 국어 전문가입니다. 체계적인 독해 방법론과 실전 문제 풀이 전략으로 학생들이 국어 영역에서 안정적인 고득점을 받을 수 있도록 지도합니다.",
    achievements: [
      "국어 영역 1등급 배출 다수",
      "독해력 향상 프로그램 개발",
      "수능 국어 분석 전문가",
    ],
    courses: [
      { title: "CONNECT 국어 비문학 완성", price: "89,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 국어 문학 완성", price: "89,000원", href: "https://unova.co.kr" },
    ],
  },
  "baek-hawook": {
    name: "백하욱",
    subject: "수학",
    subjectColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    university: "연세대학교 의과대학",
    description: "연세대학교 의과대학 출신 수학 전문가",
    longDescription: "연세대학교 의과대학 출신으로, 수학의 원리를 깊이 있게 이해하고 이를 학생들에게 명확하게 전달하는 능력을 갖춘 선생님입니다. 복잡한 개념도 쉽고 직관적으로 설명하여 학생들의 수학적 사고력을 키워줍니다.",
    achievements: [
      "연세대학교 의과대학 졸업",
      "수능 수학 만점자 다수 배출",
      "CONNECT 수학 교재 집필",
    ],
    courses: [
      { title: "CONNECT 수학1+수학2+미적분 강의", price: "220,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 미적분 강의", price: "90,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 수학2 강의", price: "80,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 수학1 강의", price: "80,000원", href: "https://unova.co.kr" },
    ],
  },
  "yoo-yerin": {
    name: "유예린",
    subject: "영어",
    subjectColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    description: "영어의 구조를 완벽하게 이해하는 방법",
    longDescription: "영어 문장의 구조와 논리를 체계적으로 분석하여 학생들이 영어를 근본적으로 이해할 수 있도록 돕습니다. 단순 암기가 아닌 원리 이해를 통해 어떤 지문이든 자신 있게 해석할 수 있는 실력을 길러줍니다.",
    achievements: [
      "영어 영역 1등급 배출 다수",
      "구문 분석 방법론 개발",
      "영어 독해력 향상 전문가",
    ],
    courses: [
      { title: "CONNECT 영어 구문 완성", price: "95,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 영어 독해 완성", price: "95,000원", href: "https://unova.co.kr" },
    ],
    headerSub: "문장 구조를 읽는 알고리즘 독해",
    imageUrl: "https://cdn.imweb.me/upload/S2024081197744ee41db01/8f48bf9db5b58.png",
    banners: [
      {
        topText: "해석이 흔들리지 않는 문장 설계 루틴",
        title: "2027 CONNECT 영어 독해",
        isNew: true,
        type: "banner1",
      },
      {
        topText: "문법을 '문제풀이 언어'로 바꾸는 실전 정리",
        title: "2027 CONNECT 영어 문법",
        isNew: true,
        type: "banner2",
      },
    ],
    reviews: [
      {
        text: "문장 구조가 보이니까 해석 속도가 확 빨라졌어요. 지문 읽는 스트레스가 줄었습니다.",
        rating: 5,
      },
      {
        text: "수업 루틴대로 하니까 모고에서 흔들리던 유형이 정리됐어요. 복습 동선이 깔끔합니다.",
        rating: 5,
      },
    ],
    notices: [
      { tag: "book", text: "CONNECT 영어 독해 예약 판매" },
      { tag: "event", text: "겨울방학 영어 루틴 챌린지" },
      { tag: "notice", text: "2027 영어 조교/자료팀 모집..." },
    ],
    floatingBanners: [
      {
        sub: "2027 수능 대비",
        title: "CONNECT 영어 독해\n기출·변형",
        desc: "교재 예약 판매\n& 루틴 챌린지!",
        gradient: "box1",
      },
      {
        sub: "2027 수능 대비",
        title: "CONNECT 영어 문법\n개념·실전",
        desc: "핵심 정리 특강\n& 자료 무료!",
        gradient: "box2",
      },
    ],
    profile: {
      education: {
        title: "학력",
        content: "2022.03 - 현재\n이화여자대학교 영어영문학부",
      },
      career: {
        title: "약력",
        content: [
          "2022 - 과외 강사",
          "2025 - 대치영어전문학원 영어 강사",
        ],
      },
      gradeImprovements: {
        title: "내신 성적 상승 사례",
        content: [
          "1학년 1학기 60점대 → 1학년 2학기 중간 80점대 (김00)",
          "1학년 1학기 4등급 → 1학년 2학기 기말 1등급 (이00)",
          "1학년 1학기 중간 70점대 → 1학년 2학기 중간 100점 (황00)",
          "1학년 2학기 5등급 → 2학년 2학기 3등급 (정00)",
          "1학년 1학기 중간 30점 → 1학년 1학기 기말 60점 (권00)",
          "1학년 1학기 80점 → 1학년 2학기 기말 1등급 (김00)",
          "1학년 1학기 2등급 → 1학년 2학기 중간 1등급 (김00)",
        ],
      },
      mockTestImprovements: {
        title: "모고 / 수능 성적 상승 사례",
        content: [
          "모의고사 4등급 → 2023학년도 수능 2등급 (박00)",
          "모의고사 30점대 → 2학년 모의고사 3등급 (이00)",
          "모의고사 50점대 → 3학년 모의고사 3등급 (김00)",
          "모의고사 4등급 → 2024학년도 수능 2등급 (김00)",
          "2023년도 수능 2등급 → 2024학년도 수능 1등급 (유00)",
          "모의고사 40점대 → 1학년 모의고사 1등급 (황00)",
        ],
      },
    },
    socialLinks: [
      {
        type: "instagram",
        url: "https://instagram.com",
        icon: "https://img.etoos.com/teacher/event/2019/12/pmo_00/05_30x30.png",
      },
      {
        type: "youtube",
        url: "https://youtube.com",
        icon: "https://img.etoos.com/enp/front/2019/11/29/200391/bn/icon_01.png",
      },
    ],
    navigationLinks: {
      curriculum: "#curriculum-section",
      lecture: "#s2025112470743cb293908",
      book: "#s20251214946d61e9e1ddd",
      board: "https://unova.co.kr/jang",
    },
    curriculum: [
      {
        title: "열간 단조 알루미늄 Unibody 디자인.\n비범한 프로 역량을 위한 탄생.",
        sub: "",
        images: [
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1510552776732-01acc9a4c4a0?auto=format&fit=crop&w=900&q=80",
        ],
      },
      {
        title: "몰입을 방해하지 않는\n미니멀 인터랙션.",
        sub: "드래그/스와이프 + 자동재생",
        images: [
          "https://images.unsplash.com/photo-1512499617640-c2f999018b72?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1510557880182-3eecf0d40a4a?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
        ],
      },
      {
        title: "하단 회전바 + 재생 버튼\n원하는 UX 그대로.",
        sub: "아임웹 코드박스용",
        images: [
          "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
        ],
      },
    ],
    bookSets: [
      {
        id: "reading",
        label: "독해",
        books: [
          {
            title: "영어 독해 세트",
            sub: "세트",
            href: "https://unova.co.kr/store",
            cover: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "영어 독해 기본",
            sub: "단권",
            href: "https://unova.co.kr/store",
            cover: "https://images.unsplash.com/photo-1455885666463-3a0d0d7f8a3b?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "영어 독해 실전",
            sub: "단권",
            href: "https://unova.co.kr/store",
            cover: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
          },
        ],
      },
      {
        id: "grammar",
        label: "문법",
        books: [
          {
            title: "영어 문법 세트",
            sub: "세트",
            href: "https://unova.co.kr/store",
            cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "영어 문법 기초",
            sub: "단권",
            href: "https://unova.co.kr/store",
            cover: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "영어 문법 심화",
            sub: "단권",
            href: "https://unova.co.kr/store",
            cover: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80",
          },
        ],
      },
    ],
    curriculumLink: "#curriculum-section",
    lectureSets: [
      {
        id: "reading",
        label: "독해",
        lectures: [
          {
            title: "CONNECT 영어 독해 기본",
            thumbnail: "https://picsum.photos/600/800?random=10",
            href: "https://unova.co.kr/store",
            accent: "#8AA7FF",
          },
          {
            title: "CONNECT 영어 독해 심화",
            thumbnail: "https://picsum.photos/600/800?random=11",
            href: "https://unova.co.kr/store",
            accent: "#FFB4A2",
          },
          {
            title: "CONNECT 영어 독해 실전",
            thumbnail: "https://picsum.photos/600/800?random=12",
            href: "https://unova.co.kr/store",
            accent: "#7EE7C6",
          },
          {
            title: "CONNECT 영어 독해 기출분석",
            thumbnail: "https://picsum.photos/600/800?random=13",
            href: "https://unova.co.kr/store",
            accent: "#FFD37A",
          },
          {
            title: "CONNECT 영어 독해 파이널",
            thumbnail: "https://picsum.photos/600/800?random=14",
            href: "https://unova.co.kr/store",
            accent: "#8AA7FF",
          },
          {
            title: "CONNECT 영어 독해 특강",
            thumbnail: "https://picsum.photos/600/800?random=15",
            href: "https://unova.co.kr/store",
            accent: "#FFB4A2",
          },
        ],
      },
      {
        id: "grammar",
        label: "문법",
        lectures: [
          {
            title: "CONNECT 영어 문법 기초",
            thumbnail: "https://picsum.photos/600/800?random=20",
            href: "https://unova.co.kr/store",
            accent: "#7EE7C6",
          },
          {
            title: "CONNECT 영어 문법 심화",
            thumbnail: "https://picsum.photos/600/800?random=21",
            href: "https://unova.co.kr/store",
            accent: "#FFD37A",
          },
          {
            title: "CONNECT 영어 문법 실전",
            thumbnail: "https://picsum.photos/600/800?random=22",
            href: "https://unova.co.kr/store",
            accent: "#8AA7FF",
          },
          {
            title: "CONNECT 영어 문법 파이널",
            thumbnail: "https://picsum.photos/600/800?random=23",
            href: "https://unova.co.kr/store",
            accent: "#FFB4A2",
          },
        ],
      },
    ],
    youtubeVideos: [
      { url: "https://www.youtube.com/watch?v=oNy0fbdDcPQ&t=68s" },
      { url: "https://www.youtube.com/watch?v=OCpWyq-sybk&t=9s" },
      { url: "https://www.youtube.com/watch?v=eFHT-XQbuQQ&t=2102s" },
      { url: "https://www.youtube.com/watch?v=TznVViXZcDQ&t=2101s" },
      { url: "https://www.youtube.com/watch?v=YSjIi_iHagk&t=7s" },
      { url: "https://www.youtube.com/watch?v=Oc184mmzxz8&t=1348s" },
    ],
    faqItems: [
      {
        label: "[수강문의]",
        labelColor: "blue" as const,
        question: "강의는 어디서 수강하고, 수강기간은 어떻게 되나요?",
        answer: (
          <>
            <p>결제 완료 후 &quot;마이페이지 &gt; 주문/콘텐츠&quot;에서 바로 수강이 가능합니다.</p>
            <ul>
              <li><b>수강기간</b>: 상품 상세페이지에 명시된 기간이 기준입니다.</li>
              <li><b>수강 시작</b>: 결제 후 즉시 시작(일부 사전예약은 오픈일 기준).</li>
              <li><b>업데이트형</b>: 수강기간 내 추가 영상이 순차 제공될 수 있습니다.</li>
            </ul>
          </>
        ),
      },
      {
        label: "[수강문의]",
        labelColor: "blue" as const,
        question: "모바일/태블릿/PC에서 모두 수강 가능한가요?",
        answer: (
          <>
            <p>대부분의 콘텐츠는 <b>PC / 모바일 / 태블릿</b>에서 수강 가능합니다(크롬 권장).</p>
            <ul>
              <li>일부 네트워크(학교/독서실) 환경에서는 재생이 제한될 수 있습니다.</li>
              <li>오류 시 &quot;로그아웃→재로그인 / 다른 네트워크&quot;로 재시도해 주세요.</li>
            </ul>
          </>
        ),
      },
      {
        label: "[강의문의]",
        labelColor: "blue" as const,
        question: "Q&A/질문은 어디에 남기면 되나요?",
        answer: (
          <ul>
            <li><b>강의 페이지 Q&A</b>: 해당 강의에 직접 질문(가장 권장)</li>
            <li><b>고객센터/카카오 채널</b>: 주문/환불/배송 등 운영 문의</li>
          </ul>
        ),
      },
      {
        label: "[교재문의]",
        labelColor: "purple" as const,
        question: "교재(책+PDF) 구성은 어떻게 되나요?",
        answer: (
          <>
            <p>상품명에 표기된 구성(예: <b>책+PDF</b>, <b>책 단독</b>, <b>PDF</b>) 그대로 제공됩니다.</p>
            <ul>
              <li><b>책+PDF</b>: 실물 교재 배송 + PDF(다운로드 또는 열람형) 제공</li>
              <li><b>책 단독</b>: 실물 교재만 제공</li>
              <li><b>PDF</b>: 디지털 파일(혹은 열람형 콘텐츠)만 제공</li>
            </ul>
            <p className="unova-faq__note">※ PDF 제공 방식은 상품별로 다를 수 있으니 상세페이지의 안내를 확인해 주세요.</p>
          </>
        ),
      },
      {
        label: "[배송문의]",
        labelColor: "purple" as const,
        question: "교재 배송은 얼마나 걸리고, 송장 확인은 어디서 하나요?",
        answer: (
          <>
            <p>결제 완료 후 영업일 기준으로 출고가 진행됩니다(주말/공휴일 제외).</p>
            <ul>
              <li><b>출고/배송</b>: 보통 1~3영업일 내 출고(상황에 따라 변동)</li>
              <li><b>송장</b>: 마이페이지 &gt; 주문내역에서 확인</li>
              <li><b>주소 변경</b>: 출고 전까지만 가능</li>
            </ul>
          </>
        ),
      },
      {
        label: "[환불문의]",
        labelColor: "orange" as const,
        question: "강의 환불은 어떤 기준으로 처리되나요?",
        answer: (
          <>
            <p>환불 가능 여부/금액은 <b>상품 유형</b>과 <b>이용(수강) 여부</b>에 따라 달라질 수 있습니다.</p>
            <ul>
              <li>일반적으로 <b>수강 이력(재생/열람/다운로드)</b> 및 <b>경과 시간</b>을 기준으로 산정됩니다.</li>
              <li>패키지/이벤트 상품은 부분 환불이 제한될 수 있습니다.</li>
            </ul>
          </>
        ),
      },
    ],
  },
  "jang-jinwoo": {
    name: "장진우",
    subject: "물리",
    subjectColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    description: "물리학의 원리를 직관적으로 설명하는 강의",
    longDescription: "물리학의 복잡한 개념들을 직관적이고 명확하게 설명하여 학생들이 물리를 즐기면서 공부할 수 있도록 합니다. 수능 물리학과 편입 대학물리학 모두에서 뛰어난 성과를 내고 있습니다.",
    achievements: [
      "물리학 1등급 배출 다수",
      "CONNECT 물리학 교재 집필",
      "대학물리학 편입 전문",
    ],
    courses: [
      { title: "CONNECT 물리학II 전체강의", price: "250,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 물리학II 역학 강의", price: "150,000원", href: "https://unova.co.kr" },
      { title: "CONNECT 물리학II 비역학 강의", price: "150,000원", href: "https://unova.co.kr" },
    ],
  },
  "study-crack": {
    name: "Study Crack",
    subject: "컨설팅",
    subjectColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    description: "맞춤형 입시 전략 컨설팅",
    longDescription: "학생 개개인의 상황과 목표에 맞는 맞춤형 입시 전략을 제공합니다. 정시, 수시, 편입 등 다양한 입시 전형에 대한 깊은 이해를 바탕으로 최적의 합격 전략을 설계해드립니다.",
    achievements: [
      "SKY 합격자 다수 배출",
      "의치한약수 합격 컨설팅",
      "편입 합격 전략 전문",
    ],
    courses: [
      { title: "1:1 맞춤 입시 컨설팅", price: "상담 후 결정", href: "https://unova.co.kr" },
      { title: "정시 배치표 분석", price: "상담 후 결정", href: "https://unova.co.kr" },
    ],
  },
};

export default async function TeacherDetailPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  const teacher = teachersData[teacherId];

  if (!teacher) {
    notFound();
  }

  // 새로운 디자인이 있는 선생님은 새로운 컴포넌트 사용
  const hasNewDesign =
    typeof teacher.headerSub === "string" &&
    teacher.headerSub.length > 0 &&
    typeof teacher.imageUrl === "string" &&
    teacher.imageUrl.length > 0 &&
    Array.isArray(teacher.banners) &&
    teacher.banners.length > 0 &&
    Array.isArray(teacher.reviews) &&
    Array.isArray(teacher.notices) &&
    Array.isArray(teacher.floatingBanners) &&
    Boolean(teacher.profile) &&
    Array.isArray(teacher.socialLinks) &&
    Boolean(teacher.navigationLinks);

  if (hasNewDesign) {
    return (
      <div className="min-h-screen bg-[#5f4253] text-white flex flex-col">
        <LandingHeader />
        <main className="flex-1 pt-[70px]">
          <TeacherDetailClient teacher={teacher as TeacherDetailTeacher} />
        </main>
        <Footer />
      </div>
    );
  }

  // 기존 디자인 (다른 선생님들)
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 pt-[70px]">
        {/* 프로필 섹션 */}
        <section className="py-20 md:py-28 border-b border-white/[0.06]">
          <div className="mx-auto max-w-3xl px-6">
            {/* 뒤로가기 */}
            <Link 
              href="/teachers"
              className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors mb-10"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              선생님 목록
            </Link>

            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* 프로필 이미지 */}
              <div className={`w-32 h-32 rounded-2xl ${teacher.bgColor} flex items-center justify-center shrink-0`}>
                <span className={`text-4xl font-bold ${teacher.subjectColor}`}>
                  {teacher.name.charAt(0)}
                </span>
              </div>

              {/* 정보 */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-[13px] font-medium ${teacher.bgColor} ${teacher.subjectColor}`}>
                    {teacher.subject}
                  </span>
                  {teacher.university && (
                    <span className="text-[13px] text-white/40">
                      {teacher.university}
                    </span>
                  )}
                </div>
                <h1 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em]">
                  {teacher.name} 선생님
                </h1>
                <p className="mt-4 text-[17px] text-white/60 leading-relaxed">
                  {teacher.longDescription}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 주요 성과 */}
        <section className="py-16 border-b border-white/[0.06]">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-[14px] font-medium text-white/40 uppercase tracking-wider mb-6">
              주요 성과
            </h2>
            <ul className="space-y-4">
              {teacher.achievements.map((achievement, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${teacher.subjectColor.replace('text-', 'bg-')} mt-2`} />
                  <span className="text-[17px] text-white/80">{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 강좌 목록 */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-[14px] font-medium text-white/40 uppercase tracking-wider mb-6">
              강좌
            </h2>
            <div className="space-y-3">
              {teacher.courses.map((course, idx) => (
                <a
                  key={idx}
                  href={course.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] transition-all hover:bg-white/[0.05] hover:border-white/[0.1]"
                >
                  <span className="text-[16px] font-medium text-white/90">{course.title}</span>
                  <span className="text-[15px] text-white/50 shrink-0">{course.price}</span>
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <a
                href="https://unova.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-medium transition-all hover:bg-white/90"
              >
                전체 강좌 보러가기
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

