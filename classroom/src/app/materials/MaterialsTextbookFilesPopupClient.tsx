"use client";

import { useEffect, useMemo } from "react";
import PdfPageCount from "@/app/_components/PdfPageCount";
import PdfFirstPageThumbnailClient from "@/app/materials/PdfFirstPageThumbnailClient";

type FileItem = {
  label: string;
  sizeBytes: number | null;
  pageCount: number | null;
  fileIndex: number;
};

export default function MaterialsTextbookFilesPopupClient({
  open,
  onOpenChange,
  textbookId,
  textbookTitle,
  files,
  isAdmin,
  entitlementDays,
  entitlementEndAtISO,
  createdAtISO,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbookId: string;
  textbookTitle: string;
  files: FileItem[];
  isAdmin: boolean;
  entitlementDays: number;
  entitlementEndAtISO?: string | null;
  createdAtISO: string;
}) {
  const formatBytes = (bytes: number | null) => {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let v = n;
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

  const createdAtDate = useMemo(() => new Date(createdAtISO), [createdAtISO]);
  const endAtDate = useMemo(() => (entitlementEndAtISO ? new Date(entitlementEndAtISO) : null), [entitlementEndAtISO]);

  const expiryLabel = isAdmin ? `${entitlementDays}일` : endAtDate ? `${formatKoreanDate(endAtDate)}까지` : `${entitlementDays}일`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} />

      <div className="relative w-full max-w-[720px]">
        <div className="overflow-hidden rounded-2xl bg-[#1a1a1c] shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{textbookTitle}</h3>
              <p className="mt-0.5 text-xs text-white/50">다운로드할 교재(파일)를 선택하세요.</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white/80"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-3 pb-4">
            {files.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/60">등록된 파일이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <a
                    key={`${textbookId}:${f.fileIndex}`}
                    href={`/api/textbooks/${textbookId}/download?file=${f.fileIndex}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-3 hover:bg-white/[0.07]"
                    aria-label={`${f.label} 다운로드`}
                    title="클릭하면 바로 다운로드됩니다"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <PdfFirstPageThumbnailClient src={`/api/textbooks/${textbookId}/view?file=${f.fileIndex}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{f.label}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px] leading-none">data_usage</span>
                            {formatBytes(f.sizeBytes)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px] leading-none">auto_stories</span>
                            {f.pageCount && f.pageCount > 0 ? (
                              <span>{`${f.pageCount}쪽`}</span>
                            ) : (
                              <PdfPageCount src={`/api/textbooks/${textbookId}/view?file=${f.fileIndex}`} />
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px] leading-none">schedule</span>
                            {expiryLabel}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px] leading-none">calendar_month</span>
                            {formatKoreanDate(createdAtDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-transparent text-white/55"
                      aria-hidden="true"
                      title="다운로드"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

