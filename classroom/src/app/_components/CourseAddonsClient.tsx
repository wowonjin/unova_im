"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SelectItem = {
  id: string;
  title: string;
  meta: string;
  price: number;
};

type Props = {
  courseId: string;
  initial: {
    relatedTextbookIds: string[];
    relatedCourseIds: string[];
  };
  textbooks: SelectItem[];
  courses: SelectItem[];
};

export default function CourseAddonsClient({ courseId, initial, textbooks, courses }: Props) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const [selectedTextbookIds, setSelectedTextbookIds] = useState<Set<string>>(
    new Set(initial.relatedTextbookIds ?? [])
  );
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(
    new Set(initial.relatedCourseIds ?? [])
  );

  const saveData = useCallback(async () => {
    setSaveStatus("saving");
    setSaveErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("relatedTextbookIds", JSON.stringify(Array.from(selectedTextbookIds)));
      formData.append("relatedCourseIds", JSON.stringify(Array.from(selectedCourseIds)));

      const res = await fetch("/api/admin/courses/update-addons", { method: "POST", body: formData });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg =
          payload?.message ||
          payload?.error ||
          `HTTP_${res.status}`;
        throw new Error(msg);
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
      setSaveErrorMessage(msg);
      setSaveStatus("error");
    }
  }, [courseId, selectedTextbookIds, selectedCourseIds]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveData(), 900);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [selectedTextbookIds, selectedCourseIds, saveData]);

  const labelClass = "block text-sm font-medium text-white/70 mb-1.5";

  const Section = ({
    title,
    description,
    items,
    selected,
    onToggle,
  }: {
    title: string;
    description: string;
    items: SelectItem[];
    selected: Set<string>;
    onToggle: (id: string) => void;
  }) => (
    <div>
      <label className={labelClass}>{title}</label>
      <p className="mt-1 text-xs text-white/40 mb-3">{description}</p>
      <div className="space-y-2">
        {items.map((it) => {
          const isSelected = selected.has(it.id);
          return (
            <label
              key={it.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected ? "border-amber-400 bg-amber-500/10" : "border-white/20 hover:border-white/40"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(it.id)}
                className="w-4 h-4 rounded border-white/30 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-medium truncate ${isSelected ? "text-white" : "text-white/70"}`}>
                  {it.title}
                </p>
                <p className={`text-[12px] mt-1 ${isSelected ? "text-white/50" : "text-white/40"}`}>{it.meta}</p>
              </div>
              <div className={`text-[15px] font-bold ${isSelected ? "text-white" : "text-white/70"}`}>
                {it.price.toLocaleString()}원
              </div>
            </label>
          );
        })}
        {items.length === 0 && <p className="text-sm text-white/50">표시할 항목이 없습니다.</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="h-5">
        {saveStatus === "saving" && <span className="text-sm text-white/50">저장 중...</span>}
        {saveStatus === "saved" && <span className="text-sm text-emerald-400">저장되었습니다</span>}
        {saveStatus === "error" && (
          <span className="text-sm text-red-400">
            저장 중 오류가 발생했습니다{saveErrorMessage ? ` (${saveErrorMessage})` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 왼쪽: 교재 선택 */}
        <Section
          title="교재 선택 (교재 함께 구매)"
          description="강의 상세 우측의 “교재 함께 구매” 섹션에 표시할 교재를 선택합니다."
          items={textbooks}
          selected={selectedTextbookIds}
          onToggle={(id) =>
            setSelectedTextbookIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />

        {/* 오른쪽: 강의 선택 */}
        <Section
          title="강의 선택 (추가 상품)"
          description="강의 상세 우측의 “추가 상품” 섹션에 표시할 강좌를 선택합니다."
          items={courses}
          selected={selectedCourseIds}
          onToggle={(id) =>
            setSelectedCourseIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      </div>
    </div>
  );
}


