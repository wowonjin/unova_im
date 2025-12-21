"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/app/_components/ui";

export default function CourseThumbnailUploadClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 flex flex-col gap-2 md:flex-row md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const fd = new FormData(e.currentTarget);
          fd.set("courseId", courseId);

          const res = await fetch("/api/admin/courses/thumbnail", {
            method: "POST",
            body: fd,
            headers: { "x-unova-client": "1", accept: "application/json" },
          });

          const payload = await res.json().catch(() => null);
          const redirectTo: string | undefined = payload?.redirectTo;
          if (redirectTo) {
            router.push(redirectTo);
            return;
          }

          setError("업로드에 실패했습니다. Vercel에서는 Blob 설정이 필요할 수 있습니다.");
        } catch {
          setError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <div className="flex-1">
        <Field label="이미지 파일">
          <input className="block w-full text-sm" type="file" name="thumbnail" accept="image/*" required disabled={pending} />
        </Field>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "업로드 중..." : "업로드"}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}


