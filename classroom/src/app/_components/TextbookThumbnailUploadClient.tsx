"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/app/_components/ui";

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024; // 서버 제한과 동일

async function readAsImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
      img.src = url;
    });
    return img;
  } finally {
    // NOTE: img가 로딩된 뒤에는 브라우저가 내부적으로 디코딩해두므로 revoke해도 괜찮습니다.
    URL.revokeObjectURL(url);
  }
}

async function compressImageToLimit(file: File): Promise<File> {
  // 이미 충분히 작으면 그대로 업로드
  if (file.size <= MAX_THUMBNAIL_BYTES) return file;

  const img = await readAsImage(file);
  const maxW = 1200;
  const maxH = 1200;

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const ratio = Math.min(1, maxW / Math.max(1, srcW), maxH / Math.max(1, srcH));
  const dstW = Math.max(1, Math.round(srcW * ratio));
  const dstH = Math.max(1, Math.round(srcH * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_CTX_FAILED");

  // 배경을 흰색으로 깔아 투명 PNG 업로드 시도도 안전하게 처리
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dstW, dstH);
  ctx.drawImage(img, 0, 0, dstW, dstH);

  // JPEG 품질을 단계적으로 낮추며 2MB 이하가 될 때까지 시도
  let quality = 0.9;
  for (let i = 0; i < 8; i++) {
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_THUMBNAIL_BYTES) {
      return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
    }
    quality = Math.max(0.5, quality - 0.08);
  }

  // 마지막 시도(최저 품질)
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.5),
  );
  if (blob && blob.size <= MAX_THUMBNAIL_BYTES) {
    return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
  }

  throw new Error("COMPRESS_TOO_LARGE");
}

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
                const uploadFile = await compressImageToLimit(file).catch(() => {
                  throw new Error("FILE_TOO_LARGE");
                });
                const fd = new FormData();
                fd.set("thumbnail", uploadFile);

                const res = await fetch(`/api/admin/textbooks/${textbookId}/thumbnail`, {
                  method: "POST",
                  body: fd,
                  headers: { "x-unova-client": "1", accept: "application/json" },
                });

                if (!res.ok) {
                  const payload = await res.json().catch(() => null);
                  const code = payload?.error ? String(payload.error) : `HTTP_${res.status}`;
                  const msg =
                    code === "FILE_TOO_LARGE"
                      ? "파일이 너무 큽니다. 2MB 이하 이미지로 업로드해주세요."
                      : code === "FORBIDDEN" || res.status === 403
                        ? "권한이 없어 업로드할 수 없습니다. 다시 로그인 후 시도해주세요."
                        : "업로드에 실패했습니다. 잠시 후 다시 시도해주세요.";
                  setError(msg);
                  return;
                }

                setCacheKey(Date.now());
                router.refresh();
              } catch {
                setError("업로드에 실패했습니다. (이미지 용량/형식) 잠시 후 다시 시도해주세요.");
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

