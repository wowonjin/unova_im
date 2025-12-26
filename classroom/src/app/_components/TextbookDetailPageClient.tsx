"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Props = {
  textbookId: string;
  initial: {
    price: number | null;
    originalPrice: number | null;
    rating: number | null;
    reviewCount: number;
    tags: string[];
    benefits: string[];
    features: string[];
    description: string | null;
  };
};

export default function TextbookDetailPageClient({ textbookId, initial }: Props) {
  const [price, setPrice] = useState(initial.price?.toString() || "");
  const [originalPrice, setOriginalPrice] = useState(initial.originalPrice?.toString() || "");
  const [rating, setRating] = useState(initial.rating?.toString() || "");
  const [reviewCount, setReviewCount] = useState((initial.reviewCount ?? 0).toString());
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [benefits, setBenefits] = useState((initial.benefits ?? []).join("\n"));
  const [features, setFeatures] = useState((initial.features ?? []).join("\n"));
  const [description, setDescription] = useState(initial.description || "");
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    
    try {
      const formData = new FormData();
      formData.append("textbookId", textbookId);
      formData.append("price", price);
      formData.append("originalPrice", originalPrice);
      formData.append("rating", rating);
      formData.append("reviewCount", reviewCount);
      formData.append("tags", tags);
      formData.append("benefits", benefits);
      formData.append("features", features);
      formData.append("description", description);

      const res = await fetch("/api/admin/textbooks/update-detail", {
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
  }, [textbookId, price, originalPrice, rating, reviewCount, tags, benefits, features, description]);

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
  }, [price, originalPrice, rating, reviewCount, tags, benefits, features, description, saveData]);

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
            placeholder="예: 45000"
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
            placeholder="예: 55000"
            className={inputClass}
          />
        </div>
      </div>

      {/* 평점 및 후기 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>평점 (1.0~5.0)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="5"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="예: 4.9"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>후기 수</label>
          <input
            type="number"
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value)}
            placeholder="예: 50"
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
          placeholder="예: 수학, 교재, PDF"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">쉼표(,)로 구분하여 입력하세요.</p>
      </div>

      {/* 상세 설명 */}
      <div>
        <label className={labelClass}>상세 설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="교재에 대한 상세 설명을 입력하세요..."
          rows={4}
          className={inputClass}
        />
      </div>

      {/* 혜택 */}
      <div>
        <label className={labelClass}>혜택</label>
        <textarea
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder="PDF 다운로드 가능&#10;인쇄 무제한"
          rows={4}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">줄바꿈으로 구분하여 입력하세요.</p>
      </div>

      {/* 특징 */}
      <div>
        <label className={labelClass}>특징</label>
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder="고화질 PDF&#10;풀이 포함"
          rows={4}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">줄바꿈으로 구분하여 입력하세요.</p>
      </div>
    </div>
  );
}

