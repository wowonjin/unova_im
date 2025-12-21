"use client";

import { useRef } from "react";

export default function CoursePublishedSelect({
  courseId,
  isPublished,
}: {
  courseId: string;
  isPublished: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} action="/api/admin/courses/set-published" method="post">
      <input type="hidden" name="courseId" value={courseId} />
      <select
        name="isPublished"
        defaultValue={isPublished ? "1" : "0"}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 rounded-xl border border-white/10 bg-[#29292a] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
        aria-label="공개 상태"
      >
        <option value="1">공개</option>
        <option value="0">비공개</option>
      </select>
    </form>
  );
}


