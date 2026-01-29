"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/app/_components/ui";

export default function TextbookReviewFormClient({ textbookId }: { textbookId: string }) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = Math.max(0, 5 - reviewImages.length);
    const newFiles = Array.from(files).slice(0, remaining);
    if (newFiles.length === 0) return;

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setReviewImages((prev) => [...prev, ...newFiles]);
    setReviewImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    const preview = reviewImagePreviews[index];
    if (preview) URL.revokeObjectURL(preview);
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setReviewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    reviewImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setReviewImages([]);
    setReviewImagePreviews([]);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) {
      setErrorMsg("작성자 이름과 후기 내용을 입력해주세요.");
      return;
    }

    setStatus("saving");
    setErrorMsg("");

    try {
      const imageUrls: string[] = [];
      for (const file of reviewImages) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/reviews/upload-image", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData.ok || !uploadData.url) {
          throw new Error(uploadData.error || "IMAGE_UPLOAD_FAILED");
        }
        imageUrls.push(uploadData.url);
      }

      const res = await fetch("/api/admin/textbook-reviews/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          textbookId,
          authorName: authorName.trim(),
          rating,
          content: content.trim(),
          createdAt,
          imageUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "SAVE_FAILED");
      }

      setStatus("saved");
      setAuthorName("");
      setContent("");
      setRating(5);
      clearImages();
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "후기 등록에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="작성자 이름">
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="예: 홍길동"
            required
            className="bg-transparent"
          />
        </Field>

        <Field label="평점">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl transition-colors ${
                  star <= rating ? "text-yellow-400" : "text-white/20"
                } hover:text-yellow-300`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm text-white/60">{rating}점</span>
          </div>
        </Field>

        <Field label="작성일">
          <Input
            type="datetime-local"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            className="bg-transparent"
          />
        </Field>
      </div>

      <Field label="후기 내용">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="후기 내용을 입력하세요..."
          rows={4}
          required
          className="bg-transparent"
        />
      </Field>

      <Field label="후기 이미지" hint="최대 5장, 각 2MB 이하">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          disabled={status === "saving"}
          className="bg-transparent h-auto py-2"
        />
        {reviewImagePreviews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewImagePreviews.map((url, index) => (
              <div key={`${url}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
      {status === "saved" && <p className="text-sm text-emerald-400">후기가 등록되었습니다.</p>}

      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={status === "saving"}>
          {status === "saving" ? "등록 중..." : "후기 등록"}
        </Button>
      </div>
    </form>
  );
}
