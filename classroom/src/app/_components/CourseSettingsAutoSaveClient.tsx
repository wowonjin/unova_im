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
    enrollmentDays: number;
  };
}) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [teacherName, setTeacherName] = useState(initial.teacherName ?? "");
  const [subjectName, setSubjectName] = useState(initial.subjectName ?? "");
  const [enrollmentDays, setEnrollmentDays] = useState(initial.enrollmentDays);

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
    fd.set("enrollmentDays", String(enrollmentDays));

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
  }, [title, slug, teacherName, subjectName, enrollmentDays]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="md:col-span-6">
        <Field label="강좌 제목">
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
      <div className="md:col-span-6">
        <Field
          label={
            <span className="inline-flex items-center">
              주소 이름(링크용)
              <HelpTip text="강좌 링크 주소에 들어가는 짧은 이름입니다. 보통 영어/숫자/하이픈(-)을 사용합니다. 예: connect-math-2027" />
            </span>
          }
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
        <Field label="선생님">
          <Input
            name="teacherName"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            className="bg-transparent"
          />
        </Field>
      </div>
      <div className="md:col-span-6">
        <Field label="과목">
          <Input
            name="subjectName"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="bg-transparent"
          />
        </Field>
      </div>

      <div className="md:col-span-6">
        <Field
          label={
            <span className="inline-flex items-center">
              수강 기간 (일)
              <HelpTip text="아임웹에서 구매 시 자동으로 부여되는 수강권의 유효 기간입니다. 기본값은 365일입니다." />
            </span>
          }
        >
          <Input
            name="enrollmentDays"
            type="number"
            min={1}
            max={3650}
            value={enrollmentDays}
            onChange={(e) => setEnrollmentDays(Math.max(1, parseInt(e.target.value, 10) || 365))}
            className="bg-transparent"
          />
        </Field>
      </div>

      <div className="md:col-span-12 flex justify-end">
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
