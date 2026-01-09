"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/app/_components/ui";

export default function TextbookThumbnailUploadClient({
  textbookId,
  hasThumbnail,
}: {
  textbookId: string;
  hasThumbnail: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // IMPORTANT:
  // This component is SSR-ed even though it's a Client Component.
  // Initial render must be deterministic across server/client to avoid hydration mismatch.
  const [cacheKey, setCacheKey] = useState(0);

  useEffect(() => {
    // Hydration 이후에만 캐시 키를 갱신해서 브라우저 캐시를 우회합니다.
    setCacheKey(Date.now());
  }, [hasThumbnail]);

  const thumbSrc = hasThumbnail
    ? `/api/textbooks/${textbookId}/thumbnail?v=${cacheKey}`
    : "/course-placeholder.svg";

  return (
    <Field label="썸네일">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbSrc}
          alt="교재 썸네일"
          className={`h-28 w-52 rounded-xl border border-white/10 bg-white/5 object-contain ${
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
                fd.set("thumbnail", file);

                const res = await fetch(`/api/admin/textbooks/${textbookId}/thumbnail`, {
                  method: "POST",
                  body: fd,
                  headers: { "x-unova-client": "1", accept: "application/json" },
                });

                if (!res.ok) {
                  setError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
                  return;
                }

                setCacheKey(Date.now());
                router.refresh();
              } catch {
                setError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
              } finally {
                setPending(false);
              }
            }}
          />

          {pending ? <p className="text-sm text-white/60">업로드 중...</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <p className="mt-2 text-xs text-white/50">
            이미지를 클릭하면 교재 썸네일을 업로드할 수 있습니다.
          </p>
        </div>
      </div>
    </Field>
  );
}

