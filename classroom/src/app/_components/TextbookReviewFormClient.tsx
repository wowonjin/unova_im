"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/app/_components/ui";

export default function TextbookReviewFormClient({ textbookId }: { textbookId: string }) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [createdAt, setCreatedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) {
      setErrorMsg("작성자 이름과 후기 내용을 입력해주세요.");
      return;
    }

    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/textbook-reviews/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          textbookId,
          authorName: authorName.trim(),
          rating,
          content: content.trim(),
          createdAt,
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
