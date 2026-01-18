"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReportRow = {
  id: string;
  reason: string;
  detail: string | null;
  createdAt: string;
  reporter: { type: "user"; email: string; name: string | null } | { type: "visitor"; visitorId: string | null };
  review: {
    id: string;
    productType: "COURSE" | "TEXTBOOK";
    productId: string | null;
    authorName: string;
    rating: number;
    content: string;
    createdAt: string;
  };
};

export default function ReviewsReportsAdminClient() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/admin/review-reports?take=200", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP_${res.status}`);
        setItems(Array.isArray(json.reports) ? json.reports : []);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "FETCH_FAILED");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">불러오는 중…</div>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
        불러오기 실패: {error}
      </div>
    );
  }
  if (items.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">신고가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((r) => {
        const storeHref = r.review.productId ? `/store/${r.review.productId}` : "/store";
        return (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/60">
                    {r.reason}
                  </span>
                  <span className="text-xs text-white/40">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                {r.detail ? <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{r.detail}</p> : null}
              </div>
              <div className="shrink-0 text-xs text-white/50">
                {r.reporter.type === "user" ? (
                  <span>{r.reporter.email}</span>
                ) : (
                  <span>{r.reporter.visitorId ? `visitor:${r.reporter.visitorId}` : "visitor"}</span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/50">{r.review.productType}</span>
                <span className="text-xs text-white/30">·</span>
                <Link href={storeHref} className="text-sm font-semibold text-white/90 hover:underline">
                  상품 보기
                </Link>
              </div>
              <p className="mt-2 text-xs text-white/50">
                작성자: {r.review.authorName} · 평점: {r.review.rating} · 작성일:{" "}
                {new Date(r.review.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-2 text-sm text-white/75 whitespace-pre-line line-clamp-3">{r.review.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

