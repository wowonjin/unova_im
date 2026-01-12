"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge, Field, Input, Textarea } from "@/app/_components/ui";

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

  const benefitImageUrls = benefits
    .split("\n")
    .map((x) => normalizeGcsUrl(x))
    .filter((x) => /^https?:\/\//i.test(x));

  const statusEl =
    saveStatus === "saving" ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        저장 중...
      </span>
    ) : saveStatus === "saved" ? (
      <Badge tone="success">저장됨</Badge>
    ) : saveStatus === "error" ? (
      <Badge tone="muted">저장 실패</Badge>
    ) : (
      <span className="text-xs text-white/30">자동 저장</span>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white/80">상세 페이지 설정</h3>
        <div className="shrink-0">{statusEl}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="판매 가격(원)" hint="스토어에 표시되는 가격">
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="예: 45000" className="bg-transparent" />
        </Field>
        <Field label="원래 가격(원)" hint="할인 전 가격(선택)">
          <Input
            type="number"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            placeholder="예: 55000"
            className="bg-transparent"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="태그" hint="쉼표(,)로 구분하여 입력하세요.">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 고3, 기본서" className="bg-transparent" />
        </Field>
        <Field label="교재 종류" hint="교재 구매하기 리스트에서 배지로 표시됩니다.">
          <Input value={textbookType} onChange={(e) => setTextbookType(e.target.value)} placeholder="예: 실물책+PDF" className="bg-transparent" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="선생님 타이틀(선택)" hint="상세 페이지에서 선생님 소개 제목으로 사용됩니다.">
          <Input value={teacherTitle} onChange={(e) => setTeacherTitle(e.target.value)} placeholder="예: 연세대학교 천문우주학과" className="bg-transparent" />
        </Field>
      </div>

      <Field label="맛보기 파일 URL" hint="스토어 교재 상세의 “교재소개” 표에 다운로드 버튼으로 노출됩니다.">
        <Input
          value={previewFileUrl}
          onChange={(e) => {
            const v = e.target.value;
            setPreviewFileUrl(v);
            setExtraOptions((prev) => upsertPreviewUrlLine(prev, v));
          }}
          placeholder="예: https://storage.googleapis.com/버킷/preview.pdf 또는 gs://bucket/path"
          className="bg-transparent"
        />
      </Field>

      <Field
        label="상세페이지 URL"
        hint={
          <span>
            구글 스토리지 URL을 줄바꿈으로 구분해 입력하세요. (예: <span className="text-white/50">https://storage.googleapis.com/...</span> 또는{" "}
            <span className="text-white/50">gs://bucket/path</span>)
          </span>
        }
      >
        <Textarea
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder={"https://.../detail-1.png\nhttps://.../detail-2.jpg"}
          rows={4}
          className="bg-transparent"
        />
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
      </Field>
    </div>
  );
}

