"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type StorePreviewProduct = {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  price: number;
  originalPrice: number | null;
  tags: string[];
  type: "course" | "textbook";
  thumbnailUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
};

const types = ["교재", "강의"] as const;
type TypeLabel = (typeof types)[number];

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function getDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export default function StorePreviewTabs({
  courses,
  textbooks,
  defaultType = "교재",
}: {
  courses: StorePreviewProduct[];
  textbooks: StorePreviewProduct[];
  defaultType?: TypeLabel;
}) {
  const [selectedType, setSelectedType] = useState<TypeLabel>(defaultType);
  const [selectedSubject, setSelectedSubject] = useState<string>("전체");

  const currentType: "course" | "textbook" = selectedType === "강좌" ? "course" : "textbook";
  const productsOfCurrentType = currentType === "course" ? courses : textbooks;

  const subjects = useMemo(() => {
    const subjectOrder = ["전체", "수학", "물리학I", "물리학II"];
    const subjectSet = new Set(productsOfCurrentType.map((p) => p.subject).filter(Boolean));
    const ordered = subjectOrder.filter((s) => s === "전체" || subjectSet.has(s));
    const other = Array.from(subjectSet).filter((s) => !subjectOrder.includes(s));
    return [...ordered, ...other];
  }, [productsOfCurrentType]);

  const filteredProducts = useMemo(() => {
    if (selectedSubject === "전체") return productsOfCurrentType;
    return productsOfCurrentType.filter((p) => p.subject === selectedSubject);
  }, [productsOfCurrentType, selectedSubject]);

  // 선택 타입/상품이 바뀌면서 현재 과목이 사라진 경우, 안전하게 "전체"로 리셋
  useEffect(() => {
    if (selectedSubject === "전체") return;
    if (!subjects.includes(selectedSubject)) setSelectedSubject("전체");
  }, [selectedSubject, subjects]);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      {/* 과목(왼쪽) + 타입(오른쪽) 한 줄 */}
      <div className="flex items-center justify-between gap-3">
        {/* 과목 필터 */}
        {subjects.length > 1 ? (
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  selectedSubject === subject
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* 타입(교재/강좌) 탭 */}
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedType(t);
                setSelectedSubject("전체");
              }}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                selectedType === t ? "bg-white text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="mt-6">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
            {filteredProducts.slice(0, 12).map((product) => (
              <Link key={product.id} href={`/store/${product.id}`} className="group">
                <div
                  className={`relative aspect-video overflow-hidden transition-all rounded-2xl ${
                    product.type === "textbook"
                      ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02] group-hover:scale-[1.02]"
                      : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                  }`}
                >
                  {product.thumbnailUrl ? (
                    product.type === "textbook" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative h-[85%] w-auto">
                          <div
                            className="absolute inset-0 translate-x-2 translate-y-2 bg-black/40 blur-md rounded-sm"
                            style={{ transform: "translate(6px, 6px) scale(0.98)" }}
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.thumbnailUrl}
                            alt={product.title}
                            className="relative h-full w-auto object-contain"
                            style={{
                              filter:
                                "drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 10px 20px rgba(0,0,0,0.25))",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
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
                          aria-hidden="true"
                        >
                          {product.type === "course" ? "play_circle" : "auto_stories"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 px-1">
                  <h3 className="text-[15px] font-medium text-white leading-snug line-clamp-2 group-hover:text-white/90">
                    {product.title}
                  </h3>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-white">{formatPrice(product.price)}</span>
                    {product.originalPrice ? (
                      <>
                        <span className="text-[12px] text-white/30 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                        <span className="text-[12px] font-semibold text-rose-400">
                          {getDiscount(product.originalPrice, product.price)}%
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[12px] text-white">
                    <span className="flex items-center gap-0.5">
                      <span className="text-yellow-400">⭐</span>
                      <span>{(product.rating ?? 0).toFixed(1)}</span>
                      <span>({product.reviewCount ?? 0})</span>
                    </span>
                    {product.teacher ? (
                      <>
                        <span className="text-white/70">·</span>
                        <span>{product.teacher}T</span>
                      </>
                    ) : null}
                    <span className="text-white/70">·</span>
                    <span>{product.subject}</span>
                  </div>

                  {product.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.tags
                        .filter((t) => t.trim().toUpperCase() !== "ORIGINAL")
                        .slice(0, 6)
                        .map((t, idx) => (
                          <span
                            key={`${product.id}-tag-${t}`}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                              idx === 0
                                ? "bg-white text-black"
                                : idx === 1
                                  ? "bg-[#6376EC] text-white"
                                  : "bg-white/[0.06] text-white/70"
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-symbols-outlined text-white/20" style={{ fontSize: "64px" }} aria-hidden="true">
              search_off
            </span>
            <p className="mt-4 text-[18px] font-medium text-white/60">해당 조건의 상품이 없습니다</p>
            <p className="mt-2 text-[14px] text-white/40">다른 필터를 선택해보세요</p>
          </div>
        )}
      </div>

      {/* 모바일 전체 보기 */}
      {/* (요청사항) 상단/하단 '전체 보기' CTA 제거 */}
    </section>
  );
}


