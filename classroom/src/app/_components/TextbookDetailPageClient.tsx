"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type OtherTextbook = {
  id: string;
  title: string;
  subjectName: string | null;
  thumbnailUrl: string | null;
};

type Props = {
  textbookId: string;
  initial: {
    price: number | null;
    originalPrice: number | null;
    teacherTitle: string | null;
    teacherDescription: string | null;
    tags: string[];
    benefits: string[];
    features: string[];
    extraOptions: { name: string; value: string }[];
    description: string | null;
    relatedTextbookIds: string[];
  };
  otherTextbooks: OtherTextbook[];
};

export default function TextbookDetailPageClient({ textbookId, initial, otherTextbooks }: Props) {
  const [price, setPrice] = useState(initial.price?.toString() || "");
  const [originalPrice, setOriginalPrice] = useState(initial.originalPrice?.toString() || "");
  const [teacherTitle, setTeacherTitle] = useState(initial.teacherTitle || "");
  const [teacherDescription, setTeacherDescription] = useState(initial.teacherDescription || "");
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [benefits, setBenefits] = useState((initial.benefits ?? []).join("\n"));
  const [features, setFeatures] = useState((initial.features ?? []).join("\n"));
  const [extraOptions, setExtraOptions] = useState(
    (initial.extraOptions ?? []).map((o) => `${o.name}: ${o.value}`).join("\n")
  );
  const [description, setDescription] = useState(initial.description || "");
  const [relatedTextbookIds, setRelatedTextbookIds] = useState<string[]>(initial.relatedTextbookIds ?? []);
  
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
      formData.append("teacherTitle", teacherTitle);
      formData.append("teacherDescription", teacherDescription);
      formData.append("tags", tags);
      formData.append("benefits", benefits);
      formData.append("features", features);
      formData.append("extraOptions", extraOptions);
      formData.append("description", description);
      formData.append("relatedTextbookIds", JSON.stringify(relatedTextbookIds));

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
  }, [textbookId, price, originalPrice, teacherTitle, teacherDescription, tags, benefits, features, extraOptions, description, relatedTextbookIds]);

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
  }, [price, originalPrice, teacherTitle, teacherDescription, tags, benefits, features, extraOptions, description, relatedTextbookIds, saveData]);

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

      {/* 선생님 소개 (상세 상단에 노출) */}
      <div>
        <label className={labelClass}>선생님 한 줄 소개</label>
        <input
          type="text"
          value={teacherTitle}
          onChange={(e) => setTeacherTitle(e.target.value)}
          placeholder="예: 연세대학교 의과대학 졸업"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">교재 상세 상단의 선생님 이름 아래에 작은 글씨로 표시됩니다.</p>
      </div>

      <div>
        <label className={labelClass}>선생님 소개</label>
        <textarea
          value={teacherDescription}
          onChange={(e) => setTeacherDescription(e.target.value)}
          placeholder="선생님 소개를 입력하세요..."
          rows={4}
          className={inputClass}
        />
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

      {/* 추가 옵션 */}
      <div>
        <label className={labelClass}>추가 옵션</label>
        <textarea
          value={extraOptions}
          onChange={(e) => setExtraOptions(e.target.value)}
          placeholder={"예:\n구성: PDF + 해설\n파일형식: PDF\n페이지: 320p"}
          rows={4}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">줄바꿈으로 구분, 각 줄은 "옵션명: 값" 형태로 입력하세요.</p>
      </div>

      {/* 추가 교재 구매 설정 */}
      {otherTextbooks.length > 0 && (
        <div className="pt-6 border-t border-white/10">
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
                    isSelected 
                      ? "border-amber-400/50 bg-amber-500/10" 
                      : "border-white/10 hover:border-white/20 bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRelatedTextbookIds([...relatedTextbookIds, tb.id]);
                      } else {
                        setRelatedTextbookIds(relatedTextbookIds.filter((id) => id !== tb.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-white/30 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                  />
                  
                  {/* 썸네일 */}
                  <div className="w-8 h-10 rounded overflow-hidden bg-white/10 flex-shrink-0">
                    {tb.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tb.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">
                        📖
                      </div>
                    )}
                  </div>
                  
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tb.title}</p>
                    {tb.subjectName && (
                      <p className="text-xs text-white/50">{tb.subjectName}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          
          {relatedTextbookIds.length > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              {relatedTextbookIds.length}개 교재가 추가 교재 구매에 표시됩니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

