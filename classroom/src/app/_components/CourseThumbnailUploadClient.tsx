"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/app/_components/ui";

export default function CourseThumbnailUploadClient({
  courseId,
  hasThumbnail,
}: {
  courseId: string;
  hasThumbnail: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const thumbSrc = hasThumbnail ? `/api/courses/${courseId}/thumbnail` : "/course-placeholder.svg";

  return (
    <div>
      <Field label="썸네일">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSrc}
            alt="강좌 썸네일"
            className={`h-28 w-52 rounded-xl object-cover border border-white/10 bg-white/5 ${
              pending ? "opacity-60" : "cursor-pointer hover:opacity-95"
            }`}
            onClick={() => {
              if (pending) return;
              inputRef.current?.click();
            }}
          />

          <div className="flex-1">
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="image/*"
              disabled={pending}
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0] ?? null;
                // allow re-selecting the same file later
                e.currentTarget.value = "";
                if (!file) return;

                setError(null);
                setPending(true);
                try {
                  const fd = new FormData();
                  fd.set("courseId", courseId);
                  fd.set("thumbnail", file);

                  const res = await fetch("/api/admin/courses/thumbnail", {
                    method: "POST",
                    body: fd,
                    headers: { "x-unova-client": "1", accept: "application/json" },
                  });

                  const payload = await res.json().catch(() => null);
                  const redirectTo: string | undefined = payload?.redirectTo;
                  if (!res.ok) {
                    setError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
                    return;
                  }
                  // Server returns a redirectTo with ?thumb=saved. This also refreshes the server component.
                  if (redirectTo) router.replace(redirectTo);
                  else router.refresh();
                } catch {
                  setError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
                } finally {
                  setPending(false);
                }
              }}
            />
            {pending ? <p className="text-sm text-white/60">업로드 중...</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </div>
      </Field>
    </div>
  );
}


