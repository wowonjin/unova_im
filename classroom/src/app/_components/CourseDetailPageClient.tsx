"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Props = {
  courseId: string;
  initial: {
    price: number | null;
    originalPrice: number | null;
    tags: string[];
    benefits: string[];
    relatedTextbookIds: string[];
  };
  otherTextbooks: {
    id: string;
    title: string;
    subject: string;
    teacher: string;
    price: number;
    originalPrice: number | null;
  }[];
};

export default function CourseDetailPageClient({ courseId, initial, otherTextbooks }: Props) {
  const [price, setPrice] = useState(initial.price?.toString() || "");
  const [originalPrice, setOriginalPrice] = useState(initial.originalPrice?.toString() || "");
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [benefits, setBenefits] = useState((initial.benefits ?? []).join("\n"));
  const [selectedRelatedTextbookIds, setSelectedRelatedTextbookIds] = useState<Set<string>>(
    new Set(initial.relatedTextbookIds ?? [])
  );
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    
    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("price", price);
      formData.append("originalPrice", originalPrice);
      formData.append("tags", tags);
      formData.append("benefits", benefits);
      formData.append("relatedTextbookIds", JSON.stringify(Array.from(selectedRelatedTextbookIds)));

      const res = await fetch("/api/admin/courses/update-detail", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
    }
  }, [courseId, price, originalPrice, tags, benefits, selectedRelatedTextbookIds]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveData();
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [price, originalPrice, tags, benefits, selectedRelatedTextbookIds, saveData]);

  const inputClass = "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20";
  const labelClass = "block text-sm font-medium text-white/70 mb-1.5";

  return (
    <div className="space-y-6">
      {/* 저장 상태 표시 */}
      <div className="h-5">
        {saveStatus === "saving" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            저장 중...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            저장되었습니다
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-sm text-red-400">저장 중 오류가 발생했습니다</span>
        )}
      </div>

      {/* 가격 정보 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>판매 가격 (원)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="예: 220000"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            원래 가격 (원)
            <span className="ml-1 text-white/40 font-normal">(할인 전)</span>
          </label>
          <input
            type="number"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            placeholder="예: 270000"
            className={inputClass}
          />
        </div>
      </div>

      {/* 태그 */}
      <div>
        <label className={labelClass}>태그</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="예: 수학, 백하욱, 올인원, 미적분"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">쉼표(,)로 구분하여 입력하세요.</p>
      </div>

      {/* 수강 혜택 */}
      <div>
        <label className={labelClass}>수강 혜택 (상세페이지 이미지 URL)</label>
        <textarea
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder="https://.../detail-1.png&#10;https://.../detail-2.jpg"
          rows={4}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">이미지 URL을 줄바꿈으로 구분하여 입력하세요.</p>
      </div>

      {/* 교재 함께 구매 (강의 상세 우측에 노출할 교재 선택) */}
      <div>
        <label className={labelClass}>
          교재 함께 구매 <span className="ml-1 text-white/40 font-normal">(강의 상세 우측 옵션에 표시)</span>
        </label>
        <p className="mt-1 text-xs text-white/40 mb-3">
          선택한 교재들이 강의 상세 페이지의 “교재 함께 구매” 섹션에 표시됩니다.
        </p>
        <div className="space-y-2">
          {otherTextbooks.map((t) => {
            const isSelected = selectedRelatedTextbookIds.has(t.id);
            const discount = t.originalPrice ? Math.round((1 - t.price / t.originalPrice) * 100) : null;
            return (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-amber-400 bg-amber-500/10"
                    : "border-white/20 hover:border-white/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    setSelectedRelatedTextbookIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    });
                  }}
                  className="w-4 h-4 rounded border-white/30 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium truncate ${isSelected ? "text-white" : "text-white/70"}`}>
                    {t.title}
                  </p>
                  <p className={`text-[12px] mt-1 ${isSelected ? "text-white/50" : "text-white/40"}`}>
                    {t.subject} · {t.teacher}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {discount && (
                    <span className={`text-[12px] font-bold mr-2 ${isSelected ? "text-rose-400" : "text-rose-400/70"}`}>
                      {discount}%
                    </span>
                  )}
                  <span className={`text-[15px] font-bold ${isSelected ? "text-white" : "text-white/70"}`}>
                    {t.price.toLocaleString()}원
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        {selectedRelatedTextbookIds.size > 0 && (
          <p className="mt-3 text-sm text-white/60">
            {selectedRelatedTextbookIds.size}개 교재가 “교재 함께 구매”에 표시됩니다.
          </p>
        )}
      </div>
    </div>
  );
}

