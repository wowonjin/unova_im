"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/app/_components/ui";

export default function CourseThumbnailUploadClient({
  courseId,
  hasThumbnail,
  initialPreviewVimeoId,
}: {
  courseId: string;
  hasThumbnail: boolean;
  initialPreviewVimeoId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 캐시 버스팅을 위한 타임스탬프 (업로드 후 즉시 새 이미지 표시)
  const [cacheKey, setCacheKey] = useState(() => Date.now());

  // 강의 소개 영상 (Vimeo URL)
  const [vimeoUrl, setVimeoUrl] = useState(
    initialPreviewVimeoId ? `https://vimeo.com/${initialPreviewVimeoId}` : ""
  );
  const [videoStatus, setVideoStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const videoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // initial value changed via server refresh
    setVimeoUrl(initialPreviewVimeoId ? `https://vimeo.com/${initialPreviewVimeoId}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPreviewVimeoId]);

  const thumbSrc = hasThumbnail
    ? `/api/courses/${courseId}/thumbnail?v=${cacheKey}`
    : "/course-placeholder.svg";

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
                  // 캐시 버스팅: 새 타임스탬프로 이미지 URL 갱신
                  setCacheKey(Date.now());
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

            {/* 썸네일 오른쪽: 강의 소개 영상 */}
            <div className="mt-4">
              <p className="text-sm font-medium text-white/70">강의 소개 영상</p>
              <Input
                value={vimeoUrl}
                onChange={(e) => {
                  const next = e.target.value;
                  setVimeoUrl(next);
                  setVideoStatus("saving");
                  if (videoDebounceRef.current) clearTimeout(videoDebounceRef.current);
                  videoDebounceRef.current = setTimeout(async () => {
                    try {
                      const fd = new FormData();
                      fd.set("courseId", courseId);
                      fd.set("vimeoUrl", next);
                      const res = await fetch("/api/admin/courses/update-preview-video", {
                        method: "POST",
                        body: fd,
                        headers: { "x-unova-client": "1", accept: "application/json" },
                      });
                      if (!res.ok) throw new Error("SAVE_FAILED");
                      setVideoStatus("saved");
                      setTimeout(() => setVideoStatus("idle"), 1200);
                      // ensure store page picks up latest id in server props
                      router.refresh();
                    } catch {
                      setVideoStatus("error");
                    }
                  }, 600);
                }}
                placeholder="https://vimeo.com/123456789"
                className="mt-2 bg-transparent"
              />
              <div className="mt-1 text-xs">
                {videoStatus === "saving" ? <span className="text-white/50">저장중...</span> : null}
                {videoStatus === "saved" ? <span className="text-emerald-300/90">저장됨</span> : null}
                {videoStatus === "error" ? <span className="text-red-300/90">저장 실패</span> : null}
                {videoStatus === "idle" ? <span className="text-white/40">Vimeo 영상 주소 또는 숫자 ID를 입력하세요.</span> : null}
              </div>
            </div>
          </div>
        </div>
      </Field>
    </div>
  );
}


