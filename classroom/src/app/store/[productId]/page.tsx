import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function getStoreOwnerEmail(): string {
  return (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
}

// 더미 상품 데이터
const productsData: Record<
  string,
  {
    title: string;
    subject: string;
    subjectColor: string;
    subjectBg: string;
    teacher: string;
    teacherId: string;
    teacherTitle: string;
    teacherDescription: string;
    price: number;
    originalPrice: number | null;
    dailyPrice: number;
    type: "course" | "textbook";
    description: string;
    rating: number;
    reviewCount: number;
    tags: string[];
    studyPeriod: { regular: number; review: number };
    benefits: string[];
    features: string[];
    curriculum: {
      chapter: string;
      duration: string;
      lessons: { title: string; duration: string; isFree?: boolean }[];
    }[];
    reviews: {
      id: string;
      name: string;
      rating: number;
      date: string;
      content: string;
      course: string;
    }[];
  }
> = {
  "math-full": {
    title: "CONNECT 수학1+수학2+미적분 강의",
    subject: "수학",
    subjectColor: "text-blue-400",
    subjectBg: "bg-blue-500/20",
    teacher: "백하욱",
    teacherId: "baek-hawook",
    teacherTitle: "연세대학교 의과대학 졸업",
    teacherDescription:
      "수학의 본질을 이해하고 싶다면, 백하욱 선생님과 함께하세요. 연세대학교 의과대학 출신으로, 복잡한 수학 개념도 직관적이고 명확하게 설명해드립니다. 수능 수학 만점자를 다수 배출한 검증된 강의력으로 여러분의 수학 실력 향상을 책임집니다.",
    price: 220000,
    originalPrice: 270000,
    dailyPrice: 7333,
    type: "course",
    description:
      "연세대학교 의과대학 출신 백하욱 선생님의 수학 전 범위 마스터 강좌입니다. 수학1, 수학2, 미적분의 모든 개념을 체계적으로 정리하고 실전 문제 풀이 능력을 키워드립니다.",
    rating: 4.9,
    reviewCount: 328,
    tags: ["수학", "백하욱", "올인원", "미적분", "심화"],
    studyPeriod: { regular: 30, review: 150 },
    benefits: [
      "PDF 강의자료 무료 제공",
      "초보부터 고수까지 ALL PASS",
      "수강생 전용 질문 게시판 이용",
    ],
    features: [
      "수강 완료 시 수료증 발급",
      "모바일 수강 지원",
      "백하욱 선생님의 모든 노하우가 담긴 올인원 강의",
    ],
    curriculum: [
      {
        chapter: "CHAPTER 1 | 수학1 - 지수와 로그",
        duration: "02:30:00",
        lessons: [
          { title: "[1-0] OT - 수학1 학습 로드맵", duration: "00:08:00", isFree: true },
          { title: "[1-1] 지수의 정의와 성질", duration: "00:25:00" },
          { title: "[1-2] 지수함수의 그래프", duration: "00:30:00" },
          { title: "[1-3] 로그의 정의와 성질", duration: "00:28:00" },
          { title: "[1-4] 로그함수의 그래프", duration: "00:32:00" },
          { title: "[1-5] 지수·로그 방정식과 부등식", duration: "00:27:00" },
        ],
      },
      {
        chapter: "CHAPTER 2 | 수학1 - 삼각함수",
        duration: "03:00:00",
        lessons: [
          { title: "[2-1] 삼각함수의 정의", duration: "00:30:00" },
          { title: "[2-2] 삼각함수의 그래프", duration: "00:35:00" },
          { title: "[2-3] 삼각함수의 활용", duration: "00:40:00" },
          { title: "[2-4] 사인법칙과 코사인법칙", duration: "00:35:00" },
          { title: "[2-5] 삼각함수 심화 문제풀이", duration: "00:40:00" },
        ],
      },
      {
        chapter: "CHAPTER 3 | 수학2 - 함수의 극한과 연속",
        duration: "02:00:00",
        lessons: [
          { title: "[3-1] 함수의 극한", duration: "00:30:00" },
          { title: "[3-2] 함수의 연속", duration: "00:25:00" },
          { title: "[3-3] 극한과 연속 심화", duration: "00:35:00" },
          { title: "[3-4] 실전 문제풀이", duration: "00:30:00" },
        ],
      },
      {
        chapter: "CHAPTER 4 | 수학2 - 미분",
        duration: "03:30:00",
        lessons: [
          { title: "[4-1] 미분계수와 도함수", duration: "00:40:00" },
          { title: "[4-2] 도함수의 활용 (1) - 접선", duration: "00:35:00" },
          { title: "[4-3] 도함수의 활용 (2) - 증감과 극값", duration: "00:45:00" },
          { title: "[4-4] 도함수의 활용 (3) - 최대·최소", duration: "00:40:00" },
          { title: "[4-5] 미분 심화 문제풀이", duration: "00:50:00" },
        ],
      },
      {
        chapter: "CHAPTER 5 | 미적분 - 수열의 극한",
        duration: "02:00:00",
        lessons: [
          { title: "[5-1] 수열의 극한", duration: "00:30:00" },
          { title: "[5-2] 급수", duration: "00:35:00" },
          { title: "[5-3] 등비급수의 활용", duration: "00:30:00" },
          { title: "[5-4] 실전 문제풀이", duration: "00:25:00" },
        ],
      },
    ],
    reviews: [
      {
        id: "r1",
        name: "김**",
        rating: 5,
        date: "2025년 12월 20일",
        content:
          "정말 체계적인 강의입니다! 수학을 포기하려던 저도 이해할 수 있게 설명해주셔서 감사합니다. 특히 미적분 파트가 정말 좋았어요.",
        course: "CONNECT 수학1+수학2+미적분 강의",
      },
      {
        id: "r2",
        name: "이**",
        rating: 5,
        date: "2025년 12월 18일",
        content:
          "선생님 강의력이 정말 좋으세요. 어려운 개념도 쉽게 풀어서 설명해주셔서 이해가 잘 됩니다. 강추합니다!",
        course: "CONNECT 수학1+수학2+미적분 강의",
      },
      {
        id: "r3",
        name: "박**",
        rating: 4.5,
        date: "2025년 12월 15일",
        content:
          "가격 대비 정말 알찬 강의입니다. 수학1, 수학2, 미적분까지 한 번에 정리할 수 있어서 좋아요.",
        course: "CONNECT 수학1+수학2+미적분 강의",
      },
      {
        id: "r4",
        name: "최**",
        rating: 5,
        date: "2025년 12월 10일",
        content:
          "2달 수강하고 모의고사 2등급에서 1등급으로 올랐습니다. 백하욱 선생님 감사합니다!",
        course: "CONNECT 수학1+수학2+미적분 강의",
      },
    ],
  },
  "physics-full": {
    title: "CONNECT 물리학II 전체강의",
    subject: "물리",
    subjectColor: "text-amber-400",
    subjectBg: "bg-amber-500/20",
    teacher: "장진우",
    teacherId: "jang-jinwoo",
    teacherTitle: "UNOVA 대표",
    teacherDescription:
      "물리학은 암기가 아닌 이해입니다. 물리학의 원리를 직관적으로 설명하여 누구나 물리학을 즐기면서 공부할 수 있도록 합니다. 수능 물리학과 편입 대학물리학 모두에서 뛰어난 성과를 내고 있습니다.",
    price: 250000,
    originalPrice: 300000,
    dailyPrice: 8333,
    type: "course",
    description:
      "물리학의 원리를 직관적으로 이해하고, 실전 문제 해결 능력을 키우는 완성형 강좌입니다.",
    rating: 4.8,
    reviewCount: 215,
    tags: ["물리", "장진우", "올인원", "역학", "비역학"],
    studyPeriod: { regular: 30, review: 150 },
    benefits: [
      "PDF 강의자료 무료 제공",
      "초보부터 고수까지 ALL PASS",
      "수강생 전용 질문 게시판 이용",
    ],
    features: [
      "수강 완료 시 수료증 발급",
      "모바일 수강 지원",
      "장진우 선생님의 모든 노하우가 담긴 올인원 강의",
    ],
    curriculum: [
      {
        chapter: "CHAPTER 1 | 역학 - 힘과 운동",
        duration: "03:00:00",
        lessons: [
          { title: "[1-0] OT - 물리학II 학습 로드맵", duration: "00:10:00", isFree: true },
          { title: "[1-1] 뉴턴의 운동법칙", duration: "00:35:00" },
          { title: "[1-2] 등가속도 운동", duration: "00:30:00" },
          { title: "[1-3] 포물선 운동", duration: "00:40:00" },
          { title: "[1-4] 원운동", duration: "00:35:00" },
          { title: "[1-5] 역학 문제풀이", duration: "00:30:00" },
        ],
      },
      {
        chapter: "CHAPTER 2 | 역학 - 에너지와 운동량",
        duration: "02:30:00",
        lessons: [
          { title: "[2-1] 일과 에너지", duration: "00:30:00" },
          { title: "[2-2] 역학적 에너지 보존", duration: "00:35:00" },
          { title: "[2-3] 운동량과 충격량", duration: "00:35:00" },
          { title: "[2-4] 충돌", duration: "00:30:00" },
          { title: "[2-5] 에너지·운동량 심화", duration: "00:20:00" },
        ],
      },
      {
        chapter: "CHAPTER 3 | 비역학 - 전자기학",
        duration: "03:00:00",
        lessons: [
          { title: "[3-1] 전기장과 전위", duration: "00:40:00" },
          { title: "[3-2] 전기회로", duration: "00:35:00" },
          { title: "[3-3] 자기장", duration: "00:40:00" },
          { title: "[3-4] 전자기 유도", duration: "00:35:00" },
          { title: "[3-5] 전자기학 심화", duration: "00:30:00" },
        ],
      },
    ],
    reviews: [
      {
        id: "r1",
        name: "정**",
        rating: 5,
        date: "2025년 12월 19일",
        content:
          "물리학을 이렇게 쉽게 설명해주시다니... 정말 감사합니다. 강의 퀄리티가 최고예요!",
        course: "CONNECT 물리학II 전체강의",
      },
      {
        id: "r2",
        name: "한**",
        rating: 5,
        date: "2025년 12월 16일",
        content:
          "편입 물리 준비하면서 수강했는데 정말 도움이 많이 됐습니다. 합격했어요!",
        course: "CONNECT 물리학II 전체강의",
      },
    ],
  },
  "korean-literature": {
    title: "CONNECT 국어 문학 완성",
    subject: "국어",
    subjectColor: "text-rose-400",
    subjectBg: "bg-rose-500/20",
    teacher: "이상엽",
    teacherId: "lee-sangyeob",
    teacherTitle: "국어 전문가",
    teacherDescription:
      "국어 영역의 핵심을 정확히 짚어주는 강의로 많은 학생들의 성적 향상을 이끌어낸 국어 전문가입니다. 체계적인 독해 방법론과 실전 문제 풀이 전략으로 학생들이 국어 영역에서 안정적인 고득점을 받을 수 있도록 지도합니다.",
    price: 89000,
    originalPrice: null,
    dailyPrice: 2967,
    type: "course",
    description: "수능 국어 문학 영역의 본질을 꿰뚫는 체계적인 강좌입니다.",
    rating: 4.9,
    reviewCount: 156,
    tags: ["국어", "이상엽", "문학", "수능"],
    studyPeriod: { regular: 30, review: 90 },
    benefits: [
      "PDF 강의자료 무료 제공",
      "문학 작품집 무료 제공",
      "수강생 전용 질문 게시판 이용",
    ],
    features: [
      "수강 완료 시 수료증 발급",
      "모바일 수강 지원",
      "이상엽 선생님의 문학 분석 노하우",
    ],
    curriculum: [
      {
        chapter: "CHAPTER 1 | 문학의 기초",
        duration: "02:00:00",
        lessons: [
          { title: "[1-0] OT - 문학 학습법", duration: "00:10:00", isFree: true },
          { title: "[1-1] 문학의 본질과 기능", duration: "00:25:00" },
          { title: "[1-2] 문학 갈래의 이해", duration: "00:30:00" },
          { title: "[1-3] 문학 작품 분석법", duration: "00:35:00" },
          { title: "[1-4] 기초 실전 연습", duration: "00:20:00" },
        ],
      },
      {
        chapter: "CHAPTER 2 | 현대시",
        duration: "03:00:00",
        lessons: [
          { title: "[2-1] 현대시의 이해", duration: "00:30:00" },
          { title: "[2-2] 시어와 이미지", duration: "00:35:00" },
          { title: "[2-3] 화자와 어조", duration: "00:30:00" },
          { title: "[2-4] 필수 작품 분석", duration: "00:45:00" },
          { title: "[2-5] 현대시 문제풀이", duration: "00:40:00" },
        ],
      },
    ],
    reviews: [
      {
        id: "r1",
        name: "송**",
        rating: 5,
        date: "2025년 12월 21일",
        content: "문학이 이렇게 재밌는 과목이었다니! 선생님 강의 최고입니다.",
        course: "CONNECT 국어 문학 완성",
      },
    ],
  },
  "english-structure": {
    title: "CONNECT 영어 구문 완성",
    subject: "영어",
    subjectColor: "text-emerald-400",
    subjectBg: "bg-emerald-500/20",
    teacher: "유예린",
    teacherId: "yoo-yerin",
    teacherTitle: "영어 전문가",
    teacherDescription:
      "영어 문장의 구조와 논리를 체계적으로 분석하여 학생들이 영어를 근본적으로 이해할 수 있도록 돕습니다. 단순 암기가 아닌 원리 이해를 통해 어떤 지문도 자신 있게 해석할 수 있는 실력을 길러줍니다.",
    price: 95000,
    originalPrice: null,
    dailyPrice: 3167,
    type: "course",
    description:
      "영어 문장의 구조를 체계적으로 분석하여 어떤 지문도 정확하게 해석할 수 있는 실력을 길러줍니다.",
    rating: 4.8,
    reviewCount: 98,
    tags: ["영어", "유예린", "구문", "독해"],
    studyPeriod: { regular: 30, review: 90 },
    benefits: [
      "PDF 강의자료 무료 제공",
      "구문 분석 워크북 제공",
      "수강생 전용 질문 게시판 이용",
    ],
    features: [
      "수강 완료 시 수료증 발급",
      "모바일 수강 지원",
      "유예린 선생님의 구문 분석 노하우",
    ],
    curriculum: [
      {
        chapter: "CHAPTER 1 | 구문의 기초",
        duration: "02:00:00",
        lessons: [
          { title: "[1-0] OT - 구문 학습의 중요성", duration: "00:10:00", isFree: true },
          { title: "[1-1] 문장의 기본 구조", duration: "00:30:00" },
          { title: "[1-2] 주어와 동사 찾기", duration: "00:25:00" },
          { title: "[1-3] 목적어와 보어", duration: "00:30:00" },
          { title: "[1-4] 수식어의 이해", duration: "00:25:00" },
        ],
      },
    ],
    reviews: [
      {
        id: "r1",
        name: "윤**",
        rating: 5,
        date: "2025년 12월 22일",
        content: "구문을 이렇게 체계적으로 배운 건 처음이에요. 정말 추천합니다!",
        course: "CONNECT 영어 구문 완성",
      },
    ],
  },
};

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  try {
    const { productId } = await params;
    const storeOwnerEmail = getStoreOwnerEmail();

  // Render 등 배포 환경에서 DB 쿼리 실패 시에도 상세 페이지가 500으로 죽지 않도록 폴백 처리
  type DbCourse = Prisma.CourseGetPayload<{
    include: {
      lessons: {
        select: { id: true; title: true; durationSeconds: true; vimeoVideoId: true };
      };
    };
  }>;

  // Textbook은 운영/배포 환경에서 마이그레이션 누락(컬럼 없음) 시 쿼리가 실패할 수 있어
  // "full select"와 "minimal select"를 모두 허용하는 유니온 타입으로 다룹니다.
  type DbTextbookFull = Prisma.TextbookGetPayload<{
    select: {
      id: true;
      title: true;
      subjectName: true;
      teacherName: true;
      teacherTitle: true;
      teacherDescription: true;
      thumbnailUrl: true;
      imwebProdCode: true;
      price: true;
      originalPrice: true;
      rating: true;
      reviewCount: true;
      tags: true;
      benefits: true;
      features: true;
      description: true;
      extraOptions: true;
      entitlementDays: true;
      relatedTextbookIds: true;
      composition: true;
    };
  }>;

  type DbTextbookMinimal = Prisma.TextbookGetPayload<{
    select: {
      id: true;
      title: true;
      subjectName: true;
      teacherName: true;
      teacherTitle: true;
      teacherDescription: true;
      thumbnailUrl: true;
      imwebProdCode: true;
      price: true;
      originalPrice: true;
      rating: true;
      reviewCount: true;
      tags: true;
      benefits: true;
      features: true;
      description: true;
      entitlementDays: true;
    };
  }>;

  type DbTextbook = DbTextbookFull | DbTextbookMinimal;

  let dbCourse: DbCourse | null = null;
  let dbTextbook: DbTextbook | null = null;

  try {
    // 먼저 DB에서 강좌를 찾기 (slug로 검색)
    dbCourse = await prisma.course.findFirst({
      where: {
        OR: [{ slug: productId }, { id: productId }],
        isPublished: true,
        owner: { email: storeOwnerEmail },
      },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
          select: { id: true, title: true, durationSeconds: true, vimeoVideoId: true },
        },
      },
    });

    // DB 교재 검색
    if (!dbCourse) {
      try {
        dbTextbook = await prisma.textbook.findFirst({
          where: {
            OR: [{ id: productId }],
            isPublished: true,
            owner: { email: storeOwnerEmail },
          },
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            teacherTitle: true,
            teacherDescription: true,
            thumbnailUrl: true,
            imwebProdCode: true,
            price: true,
            originalPrice: true,
            rating: true,
            reviewCount: true,
            tags: true,
            benefits: true,
            features: true,
            description: true,
            extraOptions: true,
            entitlementDays: true,
            relatedTextbookIds: true,
            composition: true,
          },
        });
      } catch (e) {
        // 운영/로컬 환경에서 마이그레이션 누락 등으로 일부 컬럼이 없을 수 있음 → 최소 select로 폴백
        // NOTE: Next dev(Turbopack)에서 server console.error가 소스맵 오버레이 이슈를 유발하는 경우가 있어
        // 여기서는 에러 객체를 그대로 찍지 않고 warn으로 낮춰 노이즈/오버레이를 줄입니다.
        console.warn("[store/product] textbook query failed with full select. Falling back to minimal select.");
        dbTextbook = await prisma.textbook.findFirst({
          where: {
            OR: [{ id: productId }],
            isPublished: true,
            owner: { email: storeOwnerEmail },
          },
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            teacherTitle: true,
            teacherDescription: true,
            thumbnailUrl: true,
            imwebProdCode: true,
            price: true,
            originalPrice: true,
            rating: true,
            reviewCount: true,
            tags: true,
            benefits: true,
            features: true,
            description: true,
            entitlementDays: true,
          },
        });
      }
    } else {
      dbTextbook = null;
    }
  } catch (e) {
    console.error("[store/product] failed to load product from DB:", { productId, e });
    dbCourse = null;
    dbTextbook = null;
  }

  // 관련 교재 목록 가져오기 (relatedTextbookIds에 지정된 교재만)
  let relatedTextbooks: Array<{
    id: string;
    title: string;
    price: number | null;
    originalPrice: number | null;
    thumbnailUrl: string | null;
    teacherName: string | null;
    subjectName: string | null;
    rating: number | null;
    reviewCount: number | null;
  }> = [];
  
  // 교재의 relatedTextbookIds 가져오기
  const relatedTextbookIds = dbTextbook 
    ? ((dbTextbook as { relatedTextbookIds?: string[] | null }).relatedTextbookIds ?? [])
    : [];
  
  if (relatedTextbookIds.length > 0) {
    try {
      // NOTE: "교재 관리하기" 페이지의 교재 목록 정렬과 동일하게 맞춤
      // - 1차: position desc -> createdAt desc
      // - 폴백: (운영 환경에서 position 컬럼 누락 등) createdAt desc
      try {
        relatedTextbooks = await prisma.textbook.findMany({
          where: {
            isPublished: true,
            id: { in: relatedTextbookIds },
          },
          orderBy: [{ position: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            thumbnailUrl: true,
            teacherName: true,
            subjectName: true,
            rating: true,
            reviewCount: true,
          },
        });
      } catch (e) {
        console.error("[store/product] related textbooks query failed with position order, fallback to createdAt:", e);
        relatedTextbooks = await prisma.textbook.findMany({
          where: {
            isPublished: true,
            id: { in: relatedTextbookIds },
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            thumbnailUrl: true,
            teacherName: true,
            subjectName: true,
            rating: true,
            reviewCount: true,
          },
        });
      }
    } catch (e) {
      console.error("[store/product] failed to load related textbooks:", e);
      relatedTextbooks = [];
    }
  }

  // DB에서 데이터를 찾은 경우
  if (dbCourse) {
    const price = dbCourse.price || 0;
    const originalPrice = dbCourse.originalPrice || null;
    const dailyPrice = dbCourse.dailyPrice || Math.round(price / 30);
    const discount = originalPrice ? getDiscount(originalPrice, price) : null;

    // 강의 상세에서 "교재 함께 구매" 옵션으로 보여줄 교재
    // - 강좌 관리에서 선택한 relatedTextbookIds가 있으면 그것만 노출
    // - 없으면 최근 교재 6개로 폴백
    let bundleTextbooks: Array<{
      id: string;
      title: string;
      price: number | null;
      originalPrice: number | null;
      thumbnailUrl: string | null;
      teacherName: string | null;
      subjectName: string | null;
      rating: number | null;
      reviewCount: number | null;
    }> = [];
    // 강의 상세에서 "추가 상품"으로 보여줄 강좌(관리자 선택)
    let addonCourses: Array<{
      id: string;
      title: string;
      price: number | null;
      originalPrice: number | null;
      thumbnailUrl: string | null;
      teacherName: string | null;
      subjectName: string | null;
      rating: number | null;
      reviewCount: number | null;
    }> = [];
    try {
      let selectedTextbookIds: string[] | null = null;
      let selectedCourseIds: string[] | null = null;
      try {
        const rows = (await prisma.$queryRawUnsafe(
          'SELECT "relatedTextbookIds", "relatedCourseIds" FROM "Course" WHERE "id" = $1',
          dbCourse.id
        )) as any[];
        const rawTb = rows?.[0]?.relatedTextbookIds;
        const rawCs = rows?.[0]?.relatedCourseIds;
        selectedTextbookIds = Array.isArray(rawTb) ? rawTb : null;
        selectedCourseIds = Array.isArray(rawCs) ? rawCs : null;
      } catch (e) {
        console.error("[store/product] failed to read course addons via raw:", e);
        selectedTextbookIds = null;
        selectedCourseIds = null;
      }

      bundleTextbooks =
        selectedTextbookIds !== null
          ? await prisma.textbook.findMany({
              where: { isPublished: true, owner: { email: storeOwnerEmail }, id: { in: selectedTextbookIds } },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                price: true,
                originalPrice: true,
                thumbnailUrl: true,
                teacherName: true,
                subjectName: true,
                rating: true,
                reviewCount: true,
              },
            })
          : await prisma.textbook.findMany({
              where: { isPublished: true, owner: { email: storeOwnerEmail } },
              orderBy: { createdAt: "desc" },
              take: 6,
              select: {
                id: true,
                title: true,
                price: true,
                originalPrice: true,
                thumbnailUrl: true,
                teacherName: true,
                subjectName: true,
                rating: true,
                reviewCount: true,
              },
            });

      // 추가 상품(강의): 관리자가 선택한 경우에만 노출 (선택이 없으면 빈 배열)
      if (selectedCourseIds !== null) {
        addonCourses = selectedCourseIds.length
          ? await prisma.course.findMany({
              where: { isPublished: true, owner: { email: storeOwnerEmail }, id: { in: selectedCourseIds } },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                price: true,
                originalPrice: true,
                thumbnailUrl: true,
                teacherName: true,
                subjectName: true,
                rating: true,
                reviewCount: true,
              },
            })
          : [];
      } else {
        addonCourses = [];
      }
    } catch (e) {
      console.error("[store/product] failed to load bundle textbooks:", e);
      bundleTextbooks = [];
      addonCourses = [];
    }

    // lessons를 curriculum 형태로 변환
    const curriculum = [{
      chapter: "전체 강의",
      duration: formatDuration(dbCourse.lessons.reduce((acc, l) => acc + (l.durationSeconds || 0), 0)),
      lessons: dbCourse.lessons.map((l) => ({
        title: l.title,
        duration: formatDuration(l.durationSeconds || 0),
        vimeoId: l.vimeoVideoId,
      })),
    }];

    return (
      <div className="min-h-screen bg-[#161616] text-white">
        <LandingHeader />

        <main className="pt-[70px]">
          <div className="mx-auto max-w-6xl px-4">
            <ProductDetailClient
              product={{
                id: dbCourse.id,
                title: dbCourse.title,
                subject: dbCourse.subjectName || "강좌",
                subjectColor: "text-blue-400",
                subjectBg: "bg-blue-500/20",
                teacher: dbCourse.teacherName || "선생님",
                teacherId: dbCourse.slug,
                teacherTitle: dbCourse.teacherTitle || "",
                teacherDescription: dbCourse.teacherDescription || "",
                thumbnailUrl: dbCourse.thumbnailUrl,
                price,
                originalPrice,
                dailyPrice,
                type: "course",
                description: dbCourse.description || "",
                rating: dbCourse.rating ?? 0,
                reviewCount: dbCourse.reviewCount || 0,
                tags: (dbCourse.tags as string[] | null) || [],
                studyPeriod: { regular: 30, review: dbCourse.enrollmentDays - 30 },
                benefits: (dbCourse.benefits as string[] | null) || [],
                features: (dbCourse.features as string[] | null) || [],
                extraOptions: [],
                curriculum,
                reviews: [],
                discount,
                formattedPrice: formatPrice(price),
                formattedOriginalPrice: originalPrice ? formatPrice(originalPrice) : null,
                formattedDailyPrice: formatPrice(dailyPrice),
                previewVimeoId: dbCourse.previewVimeoId,
              }}
              relatedProducts={bundleTextbooks.map((t) => ({
                id: t.id,
                title: t.title,
                price: t.price || 0,
                originalPrice: t.originalPrice,
                thumbnailUrl: t.thumbnailUrl,
                teacher: t.teacherName || "선생님",
                subject: t.subjectName || "교재",
                rating: t.rating ?? 0,
                reviewCount: t.reviewCount ?? 0,
              }))}
              addonCourses={addonCourses.map((c) => ({
                id: c.id,
                title: c.title,
                price: c.price || 0,
                originalPrice: c.originalPrice,
                thumbnailUrl: c.thumbnailUrl,
                teacher: c.teacherName || "선생님",
                subject: c.subjectName || "강좌",
                rating: c.rating ?? 0,
                reviewCount: c.reviewCount ?? 0,
              }))}
            />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (dbTextbook) {
    const price = dbTextbook.price || 0;
    const originalPrice = dbTextbook.originalPrice || null;
    const dailyPrice = Math.round(price / 30);
    const discount = originalPrice ? getDiscount(originalPrice, price) : null;
    const teacherName = (dbTextbook as { teacherName?: string | null }).teacherName || "선생님";
    const teacherTitle = (dbTextbook as { teacherTitle?: string | null }).teacherTitle || "";
    const teacherDescription = (dbTextbook as { teacherDescription?: string | null }).teacherDescription || "";
    const thumbnailUrl = (dbTextbook as { thumbnailUrl?: string | null }).thumbnailUrl || null;
    const composition = (dbTextbook as { composition?: string | null }).composition ?? null;
    const isbn = (dbTextbook as { imwebProdCode?: string | null }).imwebProdCode ?? null;

    return (
      <div className="min-h-screen bg-[#161616] text-white">
        <LandingHeader />

        <main className="pt-[70px]">
          <div className="mx-auto max-w-6xl px-4">
            <ProductDetailClient
              product={{
                id: dbTextbook.id,
                title: dbTextbook.title,
                subject: dbTextbook.subjectName || "교재",
                subjectColor: "text-amber-400",
                subjectBg: "bg-amber-500/20",
                teacher: teacherName,
                teacherId: "unova",
                teacherTitle,
                teacherDescription,
                thumbnailUrl,
                isbn,
                price,
                originalPrice,
                dailyPrice,
                type: "textbook",
                description: dbTextbook.description || "",
                composition,
                rating: dbTextbook.rating ?? 0,
                reviewCount: dbTextbook.reviewCount || 0,
                tags: (dbTextbook.tags as string[] | null) || [],
                // 교재는 다운로드/이용 기간만 존재 (복습 개념 없음)
                studyPeriod: { regular: dbTextbook.entitlementDays ?? 30, review: 0 },
                benefits: (dbTextbook.benefits as string[] | null) || [],
                features: (dbTextbook.features as string[] | null) || [],
                extraOptions:
                  ((dbTextbook as { extraOptions?: { name: string; value: string }[] | null }).extraOptions as
                    | { name: string; value: string }[]
                    | null) || [],
                curriculum: [],
                reviews: [],
                discount,
                formattedPrice: formatPrice(price),
                formattedOriginalPrice: originalPrice ? formatPrice(originalPrice) : null,
                formattedDailyPrice: formatPrice(dailyPrice),
              }}
              relatedProducts={relatedTextbooks.map((t) => ({
                id: t.id,
                title: t.title,
                price: t.price || 0,
                originalPrice: t.originalPrice,
                thumbnailUrl: t.thumbnailUrl,
                teacher: t.teacherName || "선생님",
                subject: t.subjectName || "교재",
                rating: t.rating ?? 0,
                reviewCount: t.reviewCount ?? 0,
              }))}
            />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // 더미 데이터로 폴백
  const product = productsData[productId];

  if (!product) {
    notFound();
  }

  const discount = product.originalPrice
    ? getDiscount(product.originalPrice, product.price)
    : null;

  return (
    <div className="min-h-screen bg-[#161616] text-white">
      <LandingHeader />

      <main className="pt-[70px]">
        <div className="mx-auto max-w-6xl px-4">
          {/* 상품 상세 클라이언트 컴포넌트 */}
          <ProductDetailClient
            product={{
              ...product,
              id: productId,
              discount,
              formattedPrice: formatPrice(product.price),
              formattedOriginalPrice: product.originalPrice
                ? formatPrice(product.originalPrice)
                : null,
              formattedDailyPrice: formatPrice(product.dailyPrice),
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
  } catch (e) {
    console.error("[store/product] page render failed:", e);
    return (
      <div className="min-h-screen bg-[#161616] text-white">
        <LandingHeader />
        <main className="pt-[70px]">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h1 className="text-xl font-semibold text-white">상품 상세</h1>
              <p className="mt-2 text-sm text-white/70">
                상품 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/store" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
                  목록으로
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
