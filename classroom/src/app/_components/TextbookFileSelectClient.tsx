"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/app/_components/ui";

type Option = {
  id: string;
  title: string;
  originalName: string;
  storedPath?: string;
  files?: unknown;
  sizeBytes?: number | null;
  pageCount?: number | null;
};

function formatBytes(bytes: number | null | undefined): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[i]}`;
}

export default function TextbookFileSelectClient({
  textbookId,
  registeredTextbooks,
  initialSelectedIds,
}: {
  textbookId: string;
  registeredTextbooks: Option[];
  initialSelectedIds: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // 수정 화면 재진입(router.refresh 포함) 시 서버에서 내려주는 초기값을 기준으로 복원
  useEffect(() => {
    setSelectedIds(initialSelectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedIds.join(",")]);

  const options = useMemo(() => {
    return registeredTextbooks.map((t) => ({
      ...t,
      label: `${t.title}${t.originalName ? ` (${t.originalName})` : ""}`,
    }));
  }, [registeredTextbooks]);

  const selectedItems = useMemo(() => {
    return registeredTextbooks.filter((t) => selectedIds.includes(t.id));
  }, [registeredTextbooks, selectedIds]);

  const totalSize = useMemo(() => {
    return selectedItems.reduce((acc, t) => acc + (t.sizeBytes || 0), 0);
  }, [selectedItems]);

  const totalPages = useMemo(() => {
    return selectedItems.reduce((acc, t) => acc + (t.pageCount || 0), 0);
  }, [selectedItems]);

  async function apply() {
    if (selectedIds.length === 0) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/textbooks/link-files", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ textbookId, sourceTextbookIds: selectedIds }),
      });
      if (!res.ok) throw new Error("SAVE_FAILED");
      setStatus("saved");
      router.refresh();
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  }

  if (registeredTextbooks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
        <p className="text-sm text-white/50">등록된 교재가 없습니다</p>
        <a
          href="/admin/textbooks/register"
          className="mt-2 inline-block text-sm text-white/70 underline underline-offset-2 hover:text-white"
        >
          교재 업로드하기 →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field
        label="등록된 교재 선택(다중 선택)"
        hint={
          <span>
            교재 등록에서 업로드한 교재 목록입니다.{" "}
            <span className="text-white/40">(Ctrl/Shift로 여러 개 선택)</span>
          </span>
        }
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-sm text-white/60">
            선택: <span className="text-white/85 font-medium">{selectedIds.length}</span>개
            {selectedIds.length > 0 && (
              <span className="ml-2 text-white/40">
                · {formatBytes(totalSize)}
                {totalPages > 0 && ` · ${totalPages}p`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(options.map((o) => o.id))}
              disabled={options.length === 0}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              선택 해제
            </button>
          </div>
        </div>
        <select
          multiple
          value={selectedIds}
          onChange={(e) => {
            const next = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
            setSelectedIds(next);
          }}
          className="min-h-[140px] w-full rounded-xl border border-white/10 bg-[#131315] px-3 py-2 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {status === "saving" ? (
            <span className="inline-flex items-center gap-1.5 text-white/50">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              적용 중...
            </span>
          ) : status === "saved" ? (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              파일 연결됨
            </span>
          ) : status === "error" ? (
            <span className="text-red-400">연결 실패</span>
          ) : (
            <span className="text-white/40">선택한 교재의 파일 정보를 현재 교재에 연결합니다</span>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={selectedIds.length === 0 || status === "saving"}
          onClick={apply}
        >
          {status === "saving" ? "연결 중..." : "파일 연결"}
        </Button>
      </div>
    </div>
  );
}
