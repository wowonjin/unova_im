"use client";

import { useMemo } from "react";

type DownloadItem = {
  id: string; // unique (textbookId:fileIndex)
  title: string; // file label (e.g. "1권. 극한과 연속")
  thumbnailUrl: string | null;
  sizeBytes: number | null;
  pageCount: number | null;
  entitlementDays: number | null;
  entitlementEndAtISO: string | null;
  createdAtISO: string;
  downloadHref: string;
};

export default function MaterialsTextbooksSectionClient({
  items,
}: {
  items: DownloadItem[];
}) {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const formatBytes = (bytes: number | null) => {
    if (!Number.isFinite(bytes as number) || !bytes || bytes <= 0) return null;
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const digits = i <= 1 ? 0 : 1;
    return `${v.toFixed(digits)}${units[i]}`;
  };

  const formatKoreanDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-white/40" aria-hidden="true">
          menu_book
        </span>
        <h2 className="text-sm font-medium text-white/60">교재 자료</h2>
        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-medium text-white/50">{list.length}</span>
      </div>

      {/* 강좌 자료(attach_file) 섹션과 동일한 카드 리스트 형태로 노출 */}
      {list.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <a
              key={t.id}
              href={t.downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#1C1C1C] p-4 transition-colors hover:border-white/[0.12] hover:bg-[#232323]"
              aria-label={`${t.title} 다운로드`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{t.title}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {(() => {
                      const parts: string[] = [];
                      const sizeLabel = formatBytes(t.sizeBytes);
                      if (sizeLabel) parts.push(sizeLabel);
                      if (t.pageCount && t.pageCount > 0) parts.push(`${t.pageCount}쪽`);
                      const endLabel = formatKoreanDate(t.entitlementEndAtISO);
                      if (endLabel) parts.push(`${endLabel}까지`);
                      else if (t.entitlementDays && t.entitlementDays > 0) parts.push(`${t.entitlementDays}일 이용`);
                      return parts.length > 0 ? parts.join(" · ") : " ";
                    })()}
                  </p>
                </div>

                <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors group-hover:text-white/80">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    download
                  </span>
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

