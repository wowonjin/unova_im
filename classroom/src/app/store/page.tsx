import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function getStoreOwnerEmail(): string {
  // 이 프로젝트는 기본적으로 "고정 관리자(ADMIN_EMAIL)" 계정이 콘텐츠를 발행합니다.
  // 배포 환경에서 예전/다른 ownerId로 생성된 공개 강좌/교재가 남아있을 수 있어
  // 스토어는 기본적으로 관리자 이메일 소유 상품만 노출합니다.
  return (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
}

type Product = {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  price: number;
  originalPrice: number | null;
  tag: string | null;
  type: "course" | "textbook";
  thumbnailUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
};

const types = ["교재", "강좌"];

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string; type?: string }>;
}) {
  try {
    const sp = await searchParams;
    const selectedSubject = sp?.subject || "전체";
    const selectedType = sp?.type || "교재";
    const storeOwnerEmail = getStoreOwnerEmail();

    // 실제 DB에서 공개된 강좌/교재 조회
    // Render 등 배포 환경에서 DB 연결/쿼리 이슈가 발생해도 페이지 전체가 500으로 죽지 않도록 안전 폴백 처리
    type DbCourseRow = Prisma.CourseGetPayload<{
      select: {
        id: true;
        title: true;
        subjectName: true;
        teacherName: true;
        price: true;
        originalPrice: true;
        tags: true;
        thumbnailUrl: true;
        rating: true;
        reviewCount: true;
      };
    }>;

    type DbTextbookRow = Prisma.TextbookGetPayload<{
      select: {
        id: true;
        title: true;
        subjectName: true;
        teacherName: true;
        price: true;
        originalPrice: true;
        tags: true;
        thumbnailUrl: true;
        rating: true;
        reviewCount: true;
      };
    }>;

    let courses: DbCourseRow[] = [];
    let textbooks: DbTextbookRow[] = [];
    try {
      [courses, textbooks] = await Promise.all([
        prisma.course.findMany({
          where: { isPublished: true, owner: { email: storeOwnerEmail } },
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            price: true,
            originalPrice: true,
            tags: true,
            thumbnailUrl: true,
            rating: true,
            reviewCount: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.textbook.findMany({
          where: { isPublished: true, owner: { email: storeOwnerEmail } },
          select: {
            id: true,
            title: true,
            subjectName: true,
            teacherName: true,
            price: true,
            originalPrice: true,
            tags: true,
            thumbnailUrl: true,
            rating: true,
            reviewCount: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);
    } catch (e) {
      console.error("[store] failed to load products from DB:", e);
      courses = [];
      textbooks = [];
    }

  // 강좌를 Product 형태로 변환
  const courseProducts: Product[] = courses.map((c) => {
    const tags = (c.tags as string[] | null) || [];
    return {
      id: c.id,
      title: c.title,
      subject: c.subjectName || "미분류",
      teacher: c.teacherName || "선생님",
      price: c.price || 0,
      originalPrice: c.originalPrice,
      tag: tags[0] || null, // 첫 번째 태그를 배지로 표시
      type: "course" as const,
      thumbnailUrl: c.thumbnailUrl,
      rating: c.rating,
      reviewCount: c.reviewCount,
    };
  });

  // 교재를 Product 형태로 변환
  const textbookProducts: Product[] = textbooks.map((t) => {
    const tags = (t.tags as string[] | null) || [];
    return {
      id: t.id,
      title: t.title,
      subject: t.subjectName || "교재",
      teacher: t.teacherName || "선생님",
      price: t.price || 0,
      originalPrice: t.originalPrice,
      tag: tags[0] || null,
      type: "textbook" as const,
      thumbnailUrl: t.thumbnailUrl,
      rating: t.rating,
      reviewCount: t.reviewCount,
    };
  });

  const products: Product[] = [...courseProducts, ...textbookProducts];

  // 유형 맵
  const typeMap: Record<string, "course" | "textbook"> = { "강좌": "course", "교재": "textbook" };
  const currentType = typeMap[selectedType];

  // 현재 선택된 유형에 해당하는 상품들만 필터
  const productsOfCurrentType = products.filter((p) => p.type === currentType);

  // 과목 목록 (고정 순서: 전체, 수학, 물리학I, 물리학II) - 현재 유형에 있는 과목만 표시
  const subjectOrder = ["전체", "수학", "물리학I", "물리학II"];
  const subjectSet = new Set(productsOfCurrentType.map((p) => p.subject));
  // 지정된 순서에 있는 과목만 표시, 그 외 과목은 마지막에 추가
  const orderedSubjects = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
  const otherSubjects = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
  const subjects = [...orderedSubjects, ...otherSubjects];

  // 필터링
  let filteredProducts = productsOfCurrentType;
  if (selectedSubject !== "전체") {
    filteredProducts = filteredProducts.filter((p) => p.subject === selectedSubject);
  }

    return (
      <div className="min-h-screen bg-[#161616] text-white flex flex-col">
        <LandingHeader />

        <main className="flex-1 pt-[70px]">
          {/* 필터 섹션 */}
          <section className="sticky top-[70px] z-40 bg-[#161616]/80 backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* 과목 필터 */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <Link
                        key={subject}
                        href={`/store?subject=${encodeURIComponent(subject)}&type=${encodeURIComponent(selectedType)}`}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                          selectedSubject === subject
                            ? "bg-white text-black"
                            : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                        }`}
                      >
                        {subject}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 유형 필터 */}
                <div className="flex items-center gap-2 md:ml-auto">
                  <div className="flex gap-2">
                    {types.map((type) => (
                      <Link
                        key={type}
                        href={`/store?subject=${encodeURIComponent(selectedSubject)}&type=${encodeURIComponent(type)}`}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                          selectedType === type
                            ? "bg-white text-black"
                            : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                        }`}
                      >
                        {type}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

        {/* 상품 목록 */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-24">
          <div className="flex items-center justify-between mb-8">
            <p className="text-[14px] text-white/50">
              총 <span className="text-white font-medium">{filteredProducts.length}</span>개의 상품
            </p>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/store/${product.id}`}
                  className="group"
                >
                  <div className={`relative aspect-video overflow-hidden transition-all rounded-2xl ${
                    product.type === "textbook" 
                      ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02] group-hover:scale-[1.02]" 
                      : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                  }`}>
                    {/* 태그 */}
                    {product.tag && (
                      <div className="absolute top-3 left-3 z-10">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            product.tag === "BEST"
                              ? "bg-orange-500 text-white"
                              : product.tag === "NEW"
                              ? "bg-blue-500 text-white"
                              : "bg-white/20 text-white"
                          }`}
                        >
                          {product.tag}
                        </span>
                      </div>
                    )}

                    {/* 상품 이미지 영역 */}
                    {product.thumbnailUrl ? (
                      product.type === "textbook" ? (
                        // 교재: 이미지를 가운데 정렬, 입체감 있는 그림자
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative h-[85%] w-auto">
                            {/* 뒤쪽 그림자 레이어 */}
                            <div 
                              className="absolute inset-0 translate-x-2 translate-y-2 bg-black/40 blur-md rounded-sm"
                              style={{ transform: "translate(6px, 6px) scale(0.98)" }}
                            />
                            <img
                              src={product.thumbnailUrl}
                              alt={product.title}
                              className="relative h-full w-auto object-contain"
                              style={{ 
                                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 10px 20px rgba(0,0,0,0.25))",
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        // 강좌: 이미지를 전체 커버
                        <img
                          src={product.thumbnailUrl}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                            product.type === "course"
                              ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30"
                              : "bg-gradient-to-br from-amber-500/30 to-orange-500/30"
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-white/80"
                            style={{ fontSize: "28px" }}
                          >
                            {product.type === "course" ? "play_circle" : "auto_stories"}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* 상품 정보 */}
                  <div className="mt-4 px-1">
                    <h3 className="text-[15px] font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90">
                      {product.title}
                    </h3>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-[14px] font-semibold text-white">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <>
                          <span className="text-[12px] text-white/30 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                          <span className="text-[12px] font-semibold text-rose-400">
                            {getDiscount(product.originalPrice, product.price)}%
                          </span>
                        </>
                      )}
                    </div>
                    {/* 평점, 강사, 과목 */}
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-white/50">
                      <span className="flex items-center gap-0.5">
                        <span>⭐</span>
                        <span>{(product.rating ?? 0).toFixed(1)}</span>
                        <span className="text-white/40">({product.reviewCount ?? 0})</span>
                      </span>
                      {product.teacher && (
                        <>
                          <span className="text-white/30">·</span>
                          <span>{product.teacher}T</span>
                        </>
                      )}
                      <span className="text-white/30">·</span>
                      <span>{product.subject}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <span
                className="material-symbols-outlined text-white/20"
                style={{ fontSize: "64px" }}
              >
                search_off
              </span>
              <p className="mt-4 text-[18px] font-medium text-white/60">
                해당 조건의 상품이 없습니다
              </p>
              <p className="mt-2 text-[14px] text-white/40">
                다른 필터를 선택해보세요
              </p>
            </div>
          )}
        </section>

      </main>

        <Footer />
      </div>
    );
  } catch (e) {
    console.error("[store] page render failed:", e);
    return (
      <div className="min-h-screen bg-[#161616] text-white flex flex-col">
        <LandingHeader />
        <main className="flex-1 pt-[70px]">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h1 className="text-xl font-semibold text-white">교재 및 강의 구매</h1>
              <p className="mt-2 text-sm text-white/70">
                상품 목록을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/store"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
                >
                  다시 시도
                </Link>
                <Link
                  href="/teachers"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
                >
                  선생님 페이지로
                </Link>
              </div>
              <p className="mt-4 text-xs text-white/40">
                문제가 계속되면 관리자에게 문의해주세요.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

