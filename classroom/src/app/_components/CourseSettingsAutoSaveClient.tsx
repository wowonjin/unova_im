"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Field, HelpTip, Input } from "@/app/_components/ui";

type Status = "idle" | "saving" | "saved" | "error";

export default function CourseSettingsAutoSaveClient({
  courseId,
  initial,
}: {
  courseId: string;
  initial: {
    title: string;
    slug: string;
    teacherName: string | null;
    subjectName: string | null;
    isPublished: boolean;
  };
}) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [teacherName, setTeacherName] = useState(initial.teacherName ?? "");
  const [subjectName, setSubjectName] = useState(initial.subjectName ?? "");
  const [isPublished, setIsPublished] = useState(Boolean(initial.isPublished));

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  const isValid = useMemo(() => {
    return title.trim().length > 0 && slug.trim().length > 0;
  }, [title, slug]);

  async function saveNow() {
    if (!isValid) return;
    const seq = ++reqSeqRef.current;
    setStatus("saving");
    setErrorMsg(null);

    const fd = new FormData();
    fd.set("courseId", courseId);
    fd.set("title", title.trim());
    fd.set("slug", slug.trim());
    fd.set("teacherName", teacherName);
    fd.set("subjectName", subjectName);
    // Make the value explicit so the API can flip true/false deterministically.
    fd.set("isPublished", isPublished ? "1" : "0");

    const res = await fetch("/api/admin/courses/update", {
      method: "POST",
      body: fd,
      headers: { "x-unova-client": "1", accept: "application/json" },
    }).catch(() => null);

    // If a newer request started, ignore this result.
    if (seq !== reqSeqRef.current) return;

    if (!res) {
      setStatus("error");
      setErrorMsg("저장 중 네트워크 오류가 발생했습니다.");
      return;
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      const code = payload?.error;
      setStatus("error");
      setErrorMsg(
        code === "INVALID_SLUG"
          ? "주소 이름(링크용)이 올바르지 않습니다."
          : code === "SLUG_TAKEN"
            ? "이미 사용 중인 주소 이름입니다."
            : "저장에 실패했습니다. 입력값을 확인해주세요."
      );
      return;
    }

    setStatus("saved");
    // Fade back to idle after a short time.
    setTimeout(() => {
      if (reqSeqRef.current === seq) setStatus("idle");
    }, 1200);
  }

  function scheduleSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void saveNow();
    }, 600);
  }

  // Auto-save when fields change (debounced)
  useEffect(() => {
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, teacherName, subjectName, isPublished]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="md:col-span-7">
        <Field label="강좌 제목" hint="학생에게 보이는 강좌 이름입니다.">
          <Input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-transparent"
            aria-invalid={!title.trim().length}
          />
        </Field>
      </div>
      <div className="md:col-span-5">
        <Field
          label={
            <span className="inline-flex items-center">
              주소 이름(링크용)
              <HelpTip text="강좌 링크 주소에 들어가는 짧은 이름입니다. 보통 영어/숫자/하이픈(-)을 사용합니다. 예: connect-math-2027" />
            </span>
          }
          hint="예: connect-math-2027"
        >
          <Input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="bg-transparent"
            aria-invalid={!slug.trim().length}
          />
        </Field>
      </div>

      <div className="md:col-span-6">
        <Field label="선생님" hint="검색/정렬에 사용됩니다.">
          <Input
            name="teacherName"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            className="bg-transparent"
          />
        </Field>
      </div>
      <div className="md:col-span-6">
        <Field label="과목" hint="검색/정렬에 사용됩니다. 예: 수학/국어/영어">
          <Input
            name="subjectName"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="bg-transparent"
          />
        </Field>
      </div>

      <div className="md:col-span-12 flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            name="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          공개
        </label>

        <div className="text-xs">
          {status === "saving" ? <span className="text-white/60">저장중...</span> : null}
          {status === "saved" ? <span className="text-emerald-300/90">저장됨</span> : null}
          {status === "error" ? <span className="text-red-300/90">{errorMsg ?? "저장 실패"}</span> : null}
          {status === "idle" && !isValid ? <span className="text-red-300/90">필수 항목을 입력하세요.</span> : null}
        </div>
      </div>
    </div>
  );
}


