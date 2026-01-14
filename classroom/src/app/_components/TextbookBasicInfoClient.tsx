"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge, Field, Input } from "@/app/_components/ui";
import TextbookTeacherImageUpload from "./TextbookTeacherImageUpload";

type Props = {
  textbookId: string;
  initialTitle: string;
  initialTeacherName: string;
  initialTeacherImageUrl: string | null;
  initialIsbn: string;
  initialSubjectName: string;
  initialEntitlementDays: number;
  initialComposition: string;
};

export default function TextbookBasicInfoClient({
  textbookId,
  initialTitle,
  initialTeacherName,
  initialTeacherImageUrl,
  initialIsbn,
  initialSubjectName,
  initialEntitlementDays,
  initialComposition,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [teacherName, setTeacherName] = useState(initialTeacherName);
  const [teacherImageUrl, setTeacherImageUrl] = useState<string | null>(initialTeacherImageUrl);
  const [isbn, setIsbn] = useState(initialIsbn);
  const [subjectName, setSubjectName] = useState(initialSubjectName);
  const [entitlementDays, setEntitlementDays] = useState(initialEntitlementDays);
  const [composition, setComposition] = useState(initialComposition);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const resolveTeacherImageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    
    try {
      const formData = new FormData();
      formData.append("textbookId", textbookId);
      formData.append("title", title);
      formData.append("teacherName", teacherName);
      formData.append("isbn", isbn);
      formData.append("subjectName", subjectName);
      formData.append("entitlementDays", entitlementDays.toString());
      formData.append("composition", composition);

      const res = await fetch("/api/admin/textbooks/update", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      setSaveStatus("saved");
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
    }
  }, [textbookId, title, teacherName, isbn, subjectName, entitlementDays, composition]);

  // 입력 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    // 첫 렌더링 시에는 저장하지 않음
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 기존 타임아웃 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 1초 후 저장
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [title, teacherName, isbn, subjectName, entitlementDays, composition, saveData]);

  // 선생님 이름이 있고(입력됨), 이미지가 비어있으면 Teachers 테이블에서 자동 매칭해서 채움
  useEffect(() => {
    // 첫 렌더에서는 자동 매칭 호출 스킵 (서버에서 이미 내려줄 수 있음)
    if (isFirstRender.current) return;
    if ((teacherImageUrl ?? "").trim().length > 0) return;
    const key = (teacherName ?? "").trim();
    if (!key) return;

    if (resolveTeacherImageTimeoutRef.current) clearTimeout(resolveTeacherImageTimeoutRef.current);
    resolveTeacherImageTimeoutRef.current = setTimeout(async () => {
      try {
        const fd = new FormData();
        fd.set("textbookId", textbookId);
        fd.set("teacherName", key);
        const res = await fetch("/api/admin/textbooks/resolve-teacher-image", {
          method: "POST",
          body: fd,
          headers: { accept: "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const nextUrl = (data?.teacherImageUrl as string | null | undefined) ?? null;
        if (nextUrl && nextUrl !== teacherImageUrl) {
          setTeacherImageUrl(nextUrl);
          // 업로드 컴포넌트/서버 props 동기화를 위해 refresh (가벼운 수준)
          router.refresh();
        }
      } catch {
        // ignore (best-effort)
      }
    }, 700);

    return () => {
      if (resolveTeacherImageTimeoutRef.current) clearTimeout(resolveTeacherImageTimeoutRef.current);
    };
  }, [teacherName, teacherImageUrl, textbookId, router]);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white/80">기본 정보</h3>
        <div className="shrink-0">{statusEl}</div>
      </div>

      <Field label="교재 제목">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-transparent" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="출판한 선생님 이름" hint="스토어/상세 페이지에 표시할 선생님 이름입니다. (선택)">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="예: 홍길동" className="bg-transparent" />
            </div>
            <TextbookTeacherImageUpload textbookId={textbookId} currentImageUrl={teacherImageUrl} />
          </div>
        </Field>
        <Field label="과목" hint="스토어에서 과목별 필터링에 사용됩니다.">
          <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="예: 수학" className="bg-transparent" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ISBN" hint="교재 상세 페이지의 제목 오른쪽에 표시됩니다. (선택)">
          <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="예: 9781234567890" className="bg-transparent" />
        </Field>
        <Field label="구성" hint="스토어 교재 상세 페이지의 “구성” 항목에 표시됩니다.">
          <Input value={composition} onChange={(e) => setComposition(e.target.value)} placeholder="예: PDF 교재 / PDF+해설 / 2권 세트" className="bg-transparent" />
        </Field>
      </div>

      <Field label="이용 기간(일)" hint="구매 후 교재를 이용할 수 있는 기간입니다.">
        <Input
          type="number"
          value={entitlementDays}
          onChange={(e) => setEntitlementDays(Math.max(1, parseInt(e.target.value) || 30))}
          min={1}
          max={3650}
          className="bg-transparent"
        />
      </Field>
    </div>
  );
}

