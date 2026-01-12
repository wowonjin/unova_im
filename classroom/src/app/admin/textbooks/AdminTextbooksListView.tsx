"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TextbookAutoThumbnail from "@/app/_components/TextbookAutoThumbnail";

type TextbookRow = {
  id: string;
  position?: number;
  title: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string | Date;
  isPublished: boolean;
  thumbnailUrl: string | null;
  entitlementDays?: number | null;
  teacherName?: string | null;
  subjectName?: string | null;
  price?: number | null;
  originalPrice?: number | null;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function formatPrice(amount: number | null | undefined) {
  if (!Number.isFinite(amount ?? NaN)) return "—";
  return new Intl.NumberFormat("ko-KR").format(amount as number) + "원";
}

export default function AdminTextbooksListView({ items }: { items: TextbookRow[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = `${item.title} ${item.originalName} ${item.teacherName || ""} ${item.subjectName || ""}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      // Status
      if (statusFilter === "published" && !item.isPublished) return false;
      if (statusFilter === "draft" && item.isPublished) return false;
      return true;
    });
  }, [items, searchQuery, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/textbooks/${id}/delete`, { method: "POST" });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    try {
      const res = await fetch(`/api/admin/textbooks/${id}/duplicate`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || typeof json?.newId !== "string") throw new Error("DUPLICATE_FAILED");
      router.push(`/admin/textbook/${json.newId}?tab=settings`);
    } catch (e) {
      console.error(e);
      alert("복사에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDuplicating(null);
    }
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <svg className="h-7 w-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm text-white/50">등록된 판매 물품이 없습니다</p>
        <p className="mt-1 text-xs text-white/30">새 물품 등록 탭에서 교재를 판매 상품으로 등록해보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품명, 파일명, 선생님으로 검색..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/20 focus:bg-white/[0.05]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {[
              { value: "all", label: "전체" },
              { value: "published", label: "공개" },
              { value: "draft", label: "비공개" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === option.value
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-white/40">
        {filteredItems.length === items.length
          ? `총 ${items.length}개 상품`
          : `${filteredItems.length}개 검색됨 / 총 ${items.length}개`}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                상품
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 md:table-cell">
                정보
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                가격
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/40">
                상태
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                <span className="sr-only">작업</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="group transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                      <TextbookAutoThumbnail
                        textbookId={item.id}
                        existingThumbnailUrl={item.thumbnailUrl}
                        sizeBytes={item.sizeBytes}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/textbook/${item.id}`}
                        className="block truncate font-medium text-white hover:text-white/80"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-white/40">
                        {item.originalName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-4 md:table-cell">
                  <div className="space-y-1 text-xs">
                    {item.teacherName && (
                      <div className="flex items-center gap-2 text-white/50">
                        <span className="text-white/30">선생님</span>
                        {item.teacherName}
                      </div>
                    )}
                    {item.subjectName && (
                      <div className="flex items-center gap-2 text-white/50">
                        <span className="text-white/30">과목</span>
                        {item.subjectName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-white/40">
                      <span className="text-white/30">기간</span>
                      {item.entitlementDays ?? 30}일
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="space-y-0.5">
                    <div className="font-medium text-white">
                      {formatPrice(item.price)}
                    </div>
                    {item.originalPrice && item.originalPrice !== item.price && (
                      <div className="text-xs text-white/30 line-through">
                        {formatPrice(item.originalPrice)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.isPublished
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-white/5 text-white/40"
                    }`}
                  >
                    {item.isPublished ? "공개" : "비공개"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link
                      href={`/store/${item.id}`}
                      target="_blank"
                      className="rounded-md p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
                      title="스토어에서 보기"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                    <Link
                      href={`/admin/textbook/${item.id}`}
                      className="rounded-md p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
                      title="편집"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="rounded-md p-2 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      title="삭제"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDuplicate(item.id)}
                      disabled={duplicating === item.id}
                      className="rounded-md p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 disabled:opacity-50"
                      title="복사"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2h-8a2 2 0 01-2-2V7z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M6 17H5a2 2 0 01-2-2V7a2 2 0 012-2h1"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
