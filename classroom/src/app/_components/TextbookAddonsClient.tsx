"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OtherTextbook = {
  id: string;
  title: string;
  subjectName: string | null;
  thumbnailUrl: string | null;
};

type Props = {
  textbookId: string;
  otherTextbooks: OtherTextbook[];
  initialRelatedTextbookIds: string[];
};

export default function TextbookAddonsClient({ textbookId, otherTextbooks, initialRelatedTextbookIds }: Props) {
  const [relatedTextbookIds, setRelatedTextbookIds] = useState<string[]>(initialRelatedTextbookIds ?? []);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const formData = new FormData();
      formData.append("textbookId", textbookId);
      formData.append("relatedTextbookIds", JSON.stringify(relatedTextbookIds));

      const res = await fetch("/api/admin/textbooks/update-related-textbooks", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Save error:", e);
      setSaveStatus("error");
    }
  }, [textbookId, relatedTextbookIds]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, 700);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [relatedTextbookIds, saveData]);

  const labelClass = "block text-sm font-medium text-white/70 mb-1.5";

  if (!otherTextbooks.length) {
    return <p className="text-sm text-white/60">선택할 수 있는 다른 교재가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="h-5">
        {saveStatus === "saving" && <span className="text-sm text-white/50">저장 중...</span>}
        {saveStatus === "saved" && <span className="text-sm text-emerald-400">저장되었습니다</span>}
        {saveStatus === "error" && <span className="text-sm text-red-400">저장 중 오류가 발생했습니다</span>}
      </div>

      <div>
        <label className={labelClass}>
          추가 교재 구매
          <span className="ml-2 text-white/40 font-normal">(상세 페이지에 표시할 교재 선택)</span>
        </label>
        <p className="text-xs text-white/40 mb-3">
          선택한 교재들이 이 교재의 상세 페이지 &ldquo;추가 교재 구매&rdquo; 섹션에 표시됩니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {otherTextbooks.map((tb) => {
            const isSelected = relatedTextbookIds.includes(tb.id);
            return (
              <label
                key={tb.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 hover:border-white/20 bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) setRelatedTextbookIds([...relatedTextbookIds, tb.id]);
                    else setRelatedTextbookIds(relatedTextbookIds.filter((id) => id !== tb.id));
                  }}
                  className="w-4 h-4 rounded border-white/30 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />

                <div className="w-8 h-10 rounded overflow-hidden bg-white/10 flex-shrink-0">
                  {tb.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tb.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">📖</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tb.title}</p>
                  {tb.subjectName && <p className="text-xs text-white/50">{tb.subjectName}</p>}
                </div>
              </label>
            );
          })}
        </div>

        {relatedTextbookIds.length > 0 && (
          <p className="mt-2 text-xs text-amber-400">{relatedTextbookIds.length}개 교재가 추가 교재 구매에 표시됩니다.</p>
        )}
      </div>
    </div>
  );
}


