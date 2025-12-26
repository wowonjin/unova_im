"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Props = {
  textbookId: string;
  initialTitle: string;
  initialTeacherName: string;
  initialSubjectName: string;
  initialEntitlementDays: number;
};

export default function TextbookBasicInfoClient({
  textbookId,
  initialTitle,
  initialTeacherName,
  initialSubjectName,
  initialEntitlementDays,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [teacherName, setTeacherName] = useState(initialTeacherName);
  const [subjectName, setSubjectName] = useState(initialSubjectName);
  const [entitlementDays, setEntitlementDays] = useState(initialEntitlementDays);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    
    try {
      const formData = new FormData();
      formData.append("textbookId", textbookId);
      formData.append("title", title);
      formData.append("teacherName", teacherName);
      formData.append("subjectName", subjectName);
      formData.append("entitlementDays", entitlementDays.toString());

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
  }, [textbookId, title, teacherName, subjectName, entitlementDays]);

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
  }, [title, teacherName, subjectName, entitlementDays, saveData]);

  return (
    <div className="space-y-4">
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

      {/* 교재 제목 */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">교재 제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {/* 출판한 선생님 이름 */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">출판한 선생님 이름</label>
        <input
          type="text"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          placeholder="예: 홍길동"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <p className="mt-1 text-xs text-white/40">스토어/상세 페이지에 표시할 선생님 이름입니다. (선택)</p>
      </div>

      {/* 과목 */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">과목</label>
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="예: 수학, 물리, 국어, 영어"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <p className="mt-1 text-xs text-white/40">스토어에서 과목별 필터링에 사용됩니다.</p>
      </div>

      {/* 이용 기간 */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">이용 기간 (일)</label>
        <input
          type="number"
          value={entitlementDays}
          onChange={(e) => setEntitlementDays(Math.max(1, parseInt(e.target.value) || 30))}
          min={1}
          max={3650}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <p className="mt-1 text-xs text-white/40">구매 후 교재를 이용할 수 있는 기간입니다.</p>
      </div>
    </div>
  );
}

