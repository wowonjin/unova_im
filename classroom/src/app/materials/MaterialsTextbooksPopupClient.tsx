"use client";

import { useEffect, useMemo, useState } from "react";
import PdfPageCount from "@/app/_components/PdfPageCount";

type TextbookItem = {
  id: string;
  title: string;
  sizeBytes: number;
  pageCount: number | null;
  entitlementDays: number;
  createdAt: string | Date;
};

export default function MaterialsTextbooksPopupClient({
  textbooks,
  isAdmin,
  entitlementEndAtByTextbookId,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  textbooks: TextbookItem[];
  isAdmin: boolean;
  entitlementEndAtByTextbookId?: Record<string, string>; // ISO
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const isControlled = typeof openProp === "boolean" && typeof onOpenChange === "function";
  const open = isControlled ? (openProp as boolean) : openUncontrolled;
  const setOpen = isControlled ? (onOpenChange as (v: boolean) => void) : setOpenUncontrolled;

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const digits = i === 0 ? 0 : i === 1 ? 0 : 1;
    return `${v.toFixed(digits)}${units[i]}`;
  };

  const formatKoreanDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const endAtById = entitlementEndAtByTextbookId ?? {};

  const list = useMemo(() => {
    const src = Array.isArray(textbooks) ? textbooks : [];
    return src.map((t) => ({
      ...t,
      createdAtDate: new Date(t.createdAt),
      endAtDate: endAtById[t.id] ? new Date(endAtById[t.id]) : null,
    }));
  }, [textbooks, endAtById]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!list.length}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px] text-white/70" aria-hidden="true">
            menu_book
          </span>
          <span>교재</span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-medium text-white/60">{list.length}</span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[1500]">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          <div className="absolute inset-x-0 top-10 mx-auto w-[min(720px,calc(100vw-24px))]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1c] shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-white">교재 목록</h3>
                  <p className="mt-0.5 text-xs text-white/50">다운로드할 교재를 선택하세요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  aria-label="닫기"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-2">
                {list.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-white/60">업로드된 교재가 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {list.map((t) => {
                      const expiryLabel = isAdmin
                        ? `${t.entitlementDays}일`
                        : t.endAtDate
                          ? `${formatKoreanDate(t.endAtDate)}까지`
                          : `${t.entitlementDays}일`;
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#1C1C1C] px-4 py-3 hover:border-white/[0.12] hover:bg-[#232323]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{t.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[12px] leading-none">data_usage</span>
                                {formatBytes(t.sizeBytes)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[12px] leading-none">auto_stories</span>
                                {t.pageCount && t.pageCount > 0 ? (
                                  <span>{`${t.pageCount}쪽`}</span>
                                ) : (
                                  <PdfPageCount src={`/api/textbooks/${t.id}/view`} />
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[12px] leading-none">schedule</span>
                                {expiryLabel}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[12px] leading-none">calendar_month</span>
                                {formatKoreanDate(t.createdAtDate)}
                              </span>
                            </div>
                          </div>

                          <a
                            href={`/api/textbooks/${t.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            <span className="hidden sm:inline">다운로드</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

