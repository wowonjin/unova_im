"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LiveReview = {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  createdAtISO: string;
  productType: "COURSE" | "TEXTBOOK";
  productId: string;
  productTitle: string;
  teacherName?: string;
  productRating?: number | null;
};

function formatReviewDateTime(createdAtISO: string): string {
  const date = new Date(createdAtISO);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

function renderStars(rating: number): string {
  const full = Math.max(1, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function LiveCourseReviewFeed() {
  const [reviews, setReviews] = useState<LiveReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/reviews/recent-courses?limit=8", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.ok || !Array.isArray(json.reviews)) return;
        setReviews(json.reviews);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReviews();
    const timer = window.setInterval(fetchReviews, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const visibleReviews = useMemo(() => reviews.slice(0, 8), [reviews]);

  return (
    <section className="relative left-1/2 right-1/2 mt-8 w-screen -translate-x-1/2 bg-[#131313] md:mt-10">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-7 md:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        <div className="shrink-0 lg:w-[230px]">
            <h3 className="whitespace-pre-line text-[22px] font-semibold leading-[1.35] tracking-[-0.03em] text-white">
              {"유노바 수강생 후기"}
            </h3>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-white/55">
              {"나도 할 수 있을까 고민이 된다면\n수강생들의 성공 경험을 들어보세요."}
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 pb-2 lg:flex lg:flex-1 lg:gap-5 lg:overflow-x-auto lg:px-1 lg:scrollbar-hide">
            {loading && visibleReviews.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`review-skeleton-${idx}`}
                  className={`min-h-[210px] w-full min-w-0 rounded-[18px] border border-white/10 bg-[#161616] animate-pulse lg:min-h-[248px] lg:w-[calc((100%-40px)/3)] lg:max-w-none lg:min-w-0 lg:shrink-0 lg:snap-start ${
                    idx >= 2 ? "hidden lg:block" : ""
                  }`}
                />
              ))
            ) : visibleReviews.length > 0 ? (
              visibleReviews.map((review, idx) => (
                <Link
                  key={review.id}
                  href={`/store/${review.productId}`}
                  className={`group flex min-h-[210px] w-full min-w-0 flex-col rounded-[18px] bg-[#161616] p-4 transition-colors hover:bg-[#1c1c1c] lg:min-h-[248px] lg:w-[calc((100%-40px)/3)] lg:max-w-none lg:min-w-0 lg:shrink-0 lg:snap-start lg:p-[22px] ${
                    idx >= 2 ? "hidden lg:flex" : "flex"
                  }`}
                >
                  {(() => {
                    const productRating = Number(review.productRating ?? review.rating ?? 0);
                    const safeProductRating = Number.isFinite(productRating) ? productRating : 0;
                    const teacherName = (review.teacherName || "선생님").trim() || "선생님";
                    const authorName = (review.authorName || "유*").trim() || "유*";

                    return (
                      <>
                        <div className="flex h-full flex-col">
                          <p className="mt-1 line-clamp-4 text-[13px] font-[500] leading-[1.55] tracking-[-0.03em] text-white sm:text-[15px] lg:text-[15px]">
                            {review.content}
                          </p>
                          <div className="mt-auto pt-3 lg:pt-4">
                            <p className="line-clamp-2 text-[10px] leading-4 text-white sm:text-[12px] lg:text-[13px] lg:leading-5">
                              {review.productTitle}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-white lg:mt-2 lg:gap-1.5 lg:text-[11px]">
                              <span className="flex items-center gap-0.5">
                                <span className="text-yellow-400">⭐</span>
                                <span>{safeProductRating.toFixed(1)}</span>
                              </span>
                              <span className="text-white/70">·</span>
                              <span className="truncate">{teacherName}T</span>
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center gap-2 lg:mt-3 lg:gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E1E1E] text-[11px] font-semibold text-white/85 lg:h-8 lg:w-8 lg:text-[12px]">
                              {Array.from(authorName)[0] ?? "유"}
                            </div>
                            <div className="flex min-w-0 flex-col items-start gap-0.5">
                              <span className="truncate text-[11px] font-medium text-white/75 lg:text-[12px]">{authorName}</span>
                              <span className="text-[10px] text-white/40 lg:text-[11px]">
                                {formatReviewDateTime(review.createdAtISO)}
                              </span>
                            </div>
                          </div>
                        </div>

                      </>
                    );
                  })()}
                </Link>
              ))
            ) : (
              <div className="flex min-h-[248px] w-full items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-[#161616] px-6 text-center text-[14px] text-white/45">
                아직 표시할 수강 후기가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
