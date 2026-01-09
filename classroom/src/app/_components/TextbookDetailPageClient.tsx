"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function normalizeGcsUrl(s: string): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (t.toLowerCase().startsWith("gs://")) {
    return `https://storage.googleapis.com/${t.slice(5)}`;
  }
  return t;
}

function parsePreviewUrlFromExtraOptionsText(extraOptionsText: string): string {
  const lines = (extraOptionsText ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1].replace(/\s+/g, "").toLowerCase();
    const value = normalizeGcsUrl(m[2]);
    if (!value) continue;
    if (
      key === "맛보기파일url" ||
      key === "맛보기url" ||
      key === "미리보기파일url" ||
      key === "맛보기파일"
    ) {
      return value;
    }
  }
  return "";
}

function upsertPreviewUrlLine(extraOptionsText: string, previewUrl: string): string {
  const normalizedUrl = normalizeGcsUrl(previewUrl);
  const lines = (extraOptionsText ?? "").split("\n");
  const next: string[] = [];
  let replaced = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)\s*:\s*(.*)$/);
    if (!m) {
      next.push(raw);
      continue;
    }
    const key = m[1].replace(/\s+/g, "").toLowerCase();
    const isPreviewKey =
      key === "맛보기파일url" || key === "맛보기url" || key === "미리보기파일url" || key === "맛보기파일";
    if (!isPreviewKey) {
      next.push(raw);
      continue;
    }

    // previewUrl이 비어있으면 기존 라인은 제거(=skip)
    if (!normalizedUrl) continue;
    next.push(`맛보기 파일 URL: ${normalizedUrl}`);
    replaced = true;
  }

  if (normalizedUrl && !replaced) {
    if (next.length > 0) next.push("");
    next.push(`맛보기 파일 URL: ${normalizedUrl}`);
  }

  return next.join("\n").trim();
}

type Props = {
  textbookId: string;
  initial: {
    price: number | null;
    originalPrice: number | null;
    teacherTitle: string | null;
    teacherDescription: string | null;
    tags: string[];
    textbookType: string | null;
    benefits: string[];
    features: string[];
    extraOptions: { name: string; value: string }[];
    description: string | null;
    relatedTextbookIds: string[];
  };
};

export default function TextbookDetailPageClient({ textbookId, initial }: Props) {
  const [price, setPrice] = useState(initial.price?.toString() || "");
  const [originalPrice, setOriginalPrice] = useState(initial.originalPrice?.toString() || "");
  const [teacherTitle, setTeacherTitle] = useState(initial.teacherTitle || "");
  const [teacherDescription, setTeacherDescription] = useState(initial.teacherDescription || "");
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [textbookType, setTextbookType] = useState(initial.textbookType || "");
  const [benefits, setBenefits] = useState((initial.benefits ?? []).join("\n"));
  const [features, setFeatures] = useState((initial.features ?? []).join("\n"));
  const [extraOptions, setExtraOptions] = useState(
    (initial.extraOptions ?? []).map((o) => `${o.name}: ${o.value}`).join("\n")
  );
  const [previewFileUrl, setPreviewFileUrl] = useState(() => parsePreviewUrlFromExtraOptionsText(
    (initial.extraOptions ?? []).map((o) => `${o.name}: ${o.value}`).join("\n")
  ));
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
      formData.append("textbookType", textbookType);
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
  }, [textbookId, price, originalPrice, teacherTitle, teacherDescription, tags, textbookType, benefits, features, extraOptions, description, relatedTextbookIds]);

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
  }, [price, originalPrice, teacherTitle, teacherDescription, tags, textbookType, benefits, features, extraOptions, description, relatedTextbookIds, saveData]);

  const inputClass = "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20";
  const labelClass = "block text-sm font-medium text-white/70 mb-1.5";
  const benefitImageUrls = benefits
    .split("\n")
    .map((x) => normalizeGcsUrl(x))
    .filter((x) => /^https?:\/\//i.test(x));

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

      {/* 교재 종류 */}
      <div>
        <label className={labelClass}>교재 종류</label>
        <input
          type="text"
          value={textbookType}
          onChange={(e) => setTextbookType(e.target.value)}
          placeholder="예: 실전서, 기출, N제"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">교재 구매하기 리스트에서 교재 이미지 좌측 상단 배지로 표시됩니다.</p>
      </div>

      {/* 맛보기 파일 URL */}
      <div>
        <label className={labelClass}>맛보기 파일 URL</label>
        <input
          type="text"
          value={previewFileUrl}
          onChange={(e) => {
            const v = e.target.value;
            setPreviewFileUrl(v);
            // extraOptions에 자동 반영(저장은 기존 update-detail 루트에서 함께 처리)
            setExtraOptions((prev) => upsertPreviewUrlLine(prev, v));
          }}
          placeholder="예: https://storage.googleapis.com/버킷/preview.pdf 또는 gs://bucket/path"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">스토어 교재 상세의 “교재소개” 표에 다운로드 버튼으로 노출됩니다.</p>
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
        <p className="mt-1 text-xs text-white/40">
          구글 스토리지 URL을 줄바꿈으로 구분하여 입력하세요. (예: <span className="text-white/50">https://storage.googleapis.com/...</span> 또는{" "}
          <span className="text-white/50">gs://bucket/path</span>)
        </p>

        {benefitImageUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {benefitImageUrls.slice(0, 6).map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${textbookId}-benefit-preview-${idx}`}
                src={url}
                alt="수강 혜택 이미지 미리보기"
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* 추가 옵션 */}
      <div>
        <label className={labelClass}>추가 옵션</label>
        <textarea
          value={extraOptions}
          onChange={(e) => {
            const next = e.target.value;
            setExtraOptions(next);
            // 사용자가 직접 텍스트를 수정해도 맛보기 URL 입력 필드가 동기화되도록
            setPreviewFileUrl(parsePreviewUrlFromExtraOptionsText(next));
          }}
          placeholder={"예: 구성: PDF+해설\n맛보기 파일 URL: https://.../preview.pdf"}
          rows={5}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-white/40">줄바꿈으로 구분하고, “이름: 값” 형태로 입력하세요.</p>
      </div>
    </div>
  );
}

