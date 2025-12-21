"use client";

import { Button } from "@/app/_components/ui";

export default function ConfirmDeleteCourseForm({
  courseId,
  label = "삭제",
  size = "md",
}: {
  courseId: string;
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <form
      action="/api/admin/courses/delete"
      method="post"
      onSubmit={(e) => {
        const ok = window.confirm("정말 해당 강좌를 삭제하시겠습니까?");
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="dangerGhost" size={size}>
        {label}
      </Button>
    </form>
  );
}


