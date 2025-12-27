"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AdminReview = {
  id: string;
  productType: "COURSE" | "TEXTBOOK";
  productId: string | null;
  productTitle: string;
  authorName: string;
  rating: number;
  content: string;
  imageUrls: string[];
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string | null } | null;
};

export default function ReviewsAdminClient() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const lastSyncRef = useRef<string | null>(null);

  const sortedItems = useMemo(() => {
    // createdAt desc
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  const fetchReviews = useCallback(async (mode: "initial" | "since") => {
    try {
      const since = mode === "since" ? lastSyncRef.current : null;
      const qs = new URLSearchParams();
      qs.set("take", "200");
      if (since) qs.set("since", since);

      const res = await fetch(`/api/admin/reviews?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP_${res.status}`);
      }

      const next: AdminReview[] = json.reviews ?? [];
      lastSyncRef.current = json.now ?? new Date().toISOString();

      setItems((prev) => {
        if (mode === "initial") return next;
        if (next.length === 0) return prev;
        const byId = new Map(prev.map((r) => [r.id, r]));
        for (const r of next) byId.set(r.id, r);
        return Array.from(byId.values());
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "FETCH_FAILED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews("initial");
  }, [fetchReviews]);

  useEffect(() => {
    const t = setInterval(() => {
      fetchReviews("since");
    }, 4000);
    return () => clearInterval(t);
  }, [fetchReviews]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 후기를 삭제할까요? 삭제하면 복구할 수 없습니다.")) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "DELETE_FAILED");
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#1C1C1C] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span className="material-symbols-outlined text-[18px] text-white/40">schedule</span>
          <span>4초마다 자동 갱신</span>
          {error ? <span className="text-rose-300">({error})</span> : null}
        </div>
        <button
          type="button"
          onClick={() => fetchReviews("initial")}
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.12] hover:text-white"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          새로고침
        </button>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#1C1C1C] p-6 text-sm text-white/60">
          불러오는 중…
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#1C1C1C] p-6 text-sm text-white/60">
          아직 등록된 후기가 없습니다.
        </div>
      ) : (
        sortedItems.map((r) => {
          const storeHref = r.productId ? `/store/${r.productId}` : "/store";
          const ratingStars = "★★★★★".slice(0, Math.max(0, Math.min(5, r.rating)));
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-white/[0.06] bg-[#1C1C1C] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-white/60">
                      {r.productType === "COURSE" ? "강좌" : "교재"}
                    </span>
                    <Link href={storeHref} className="truncate text-sm font-semibold text-white hover:underline">
                      {r.productTitle}
                    </Link>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                    <span className="text-white/70">{ratingStars}</span>
                    <span>·</span>
                    <span>{r.rating}.0</span>
                    <span>·</span>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                    {r.user?.email ? (
                      <>
                        <span>·</span>
                        <span className="truncate">{r.user.email}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={isDeletingId === r.id}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  삭제
                </button>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/70">{r.content}</p>

              {r.imageUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.imageUrls.slice(0, 6).map((url, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${r.id}-img-${idx}`}
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                      onClick={() => window.open(url, "_blank")}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}


