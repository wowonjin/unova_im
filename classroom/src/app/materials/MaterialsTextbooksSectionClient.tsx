"use client";

import { useMemo, useState } from "react";
import MaterialsTextbookFilesPopupClient from "@/app/materials/MaterialsTextbookFilesPopupClient";

type TextbookItem = {
  id: string;
  title: string;
  sizeBytes: number;
  pageCount: number | null;
  entitlementDays: number;
  createdAtISO: string;
  thumbnailUrl: string | null;
  files?: { label: string; sizeBytes: number | null; pageCount: number | null; fileIndex: number }[];
};

export default function MaterialsTextbooksSectionClient({
  textbooks,
  isAdmin,
  entitlementEndAtByTextbookId,
}: {
  textbooks: TextbookItem[];
  isAdmin: boolean;
  entitlementEndAtByTextbookId?: Record<string, string>; // ISO
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(() => (Array.isArray(textbooks) ? textbooks : []), [textbooks]);
  const selected = useMemo(() => list.find((t) => t.id === selectedId) || null, [list, selectedId]);

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-white/40" aria-hidden="true">
          menu_book
        </span>
        <h2 className="text-sm font-medium text-white/60">교재 자료</h2>
        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-medium text-white/50">{list.length}</span>
      </div>

      {/* 카드 클릭 시: 해당 교재 1개의 파일 목록만 팝업으로 노출 */}
      {selected ? (
        <MaterialsTextbookFilesPopupClient
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setSelectedId(null);
          }}
          textbookId={selected.id}
          textbookTitle={selected.title}
          files={selected.files ?? []}
          isAdmin={isAdmin}
          entitlementDays={selected.entitlementDays}
          entitlementEndAtISO={entitlementEndAtByTextbookId?.[selected.id] ?? null}
          createdAtISO={selected.createdAtISO}
        />
      ) : null}

      {/* 썸네일 그리드: 클릭 시 다운로드가 아니라 팝업만 열림 */}
      {list.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedId(t.id);
                setOpen(true);
              }}
              className="group relative block overflow-hidden rounded-xl border border-white/[0.08] bg-transparent text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
            >
              {/* Hover hint */}
              <div className="pointer-events-none absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <span
                  className="material-symbols-outlined text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
                  style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                  aria-hidden="true"
                >
                  download
                </span>
              </div>

              <div className="relative aspect-square w-full overflow-hidden bg-white/[0.04]">
                {t.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnailUrl} alt={t.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/35" style={{ fontSize: "34px" }} aria-hidden="true">
                      auto_stories
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white">{t.title}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

