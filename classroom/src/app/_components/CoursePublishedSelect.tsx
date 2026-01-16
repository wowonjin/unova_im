"use client";

import { useRef } from "react";

export default function CoursePublishedSelect({
  courseId,
  isPublished,
  isSoldOut,
}: {
  courseId: string;
  isPublished: boolean;
  isSoldOut: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const value = !isPublished ? "0" : isSoldOut ? "soldout" : "1";

  return (
    <form ref={formRef} action="/api/admin/courses/set-published" method="post">
      <input type="hidden" name="courseId" value={courseId} />
      <select
        name="isPublished"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
        aria-label="공개 상태"
      >
        <option value="1">공개</option>
        <option value="soldout">품절</option>
        <option value="0">비공개</option>
      </select>
    </form>
  );
}


