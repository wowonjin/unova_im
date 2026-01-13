"use client";

import { useMemo } from "react";

type DownloadItem = {
  id: string; // unique (textbookId:fileIndex)
  title: string; // file label (e.g. "1권. 극한과 연속")
  thumbnailUrl: string | null;
  downloadHref: string;
};

export default function MaterialsTextbooksSectionClient({
  items,
}: {
  items: DownloadItem[];
}) {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

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
        <div className="space-y-2">
          {list.map((t) => (
            <div
              key={t.id}
              className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#1C1C1C] p-4 transition-colors hover:border-white/[0.12] hover:bg-[#232323]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <span className="material-symbols-outlined text-[20px] text-white/50" aria-hidden="true">
                    menu_book
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{t.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                    <span className="truncate">교재 자료</span>
                  </p>
                </div>
              </div>

              <a
                href={t.downloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                aria-label={`${t.title} 다운로드`}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  download
                </span>
                <span className="hidden sm:inline">다운로드</span>
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

