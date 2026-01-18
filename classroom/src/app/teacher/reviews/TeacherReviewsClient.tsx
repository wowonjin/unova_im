"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Textarea } from "@/app/_components/ui";

export type TeacherReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  createdAtISO: string;
  productType: "강좌" | "교재";
  productTitle: string;
  teacherReply: string | null;
  teacherReplyAtISO: string | null;
};

export default function TeacherReviewsClient({ reviews }: { reviews: TeacherReviewItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const unanswered = reviews.filter((r) => !(r.teacherReply || "").trim()).length;
    return { all: reviews.length, unanswered };
  }, [reviews]);

  const filtered = useMemo(() => {
    if (filter === "unanswered") return reviews.filter((r) => !(r.teacherReply || "").trim());
    return reviews;
  }, [reviews, filter]);

  const openEditor = (r: TeacherReviewItem) => {
    setEditingId(r.id);
    setDraft(r.teacherReply ?? "");
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft("");
  };

  const saveReply = async (reviewId: string) => {
    const body = draft;
    setSavingId(reviewId);
    try {
      const res = await fetch(`/api/teacher/reviews/${reviewId}/reply`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reply: body }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP_${res.status}`);
      closeEditor();
      router.refresh();
    } catch {
      alert("답글 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={filter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          전체 ({counts.all})
        </Button>
        <Button
          type="button"
          variant={filter === "unanswered" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("unanswered")}
        >
          미답변 ({counts.unanswered})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-white/50">{filter === "unanswered" ? "미답변 리뷰가 없습니다." : "아직 리뷰가 없습니다."}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const hasReply = Boolean((r.teacherReply || "").trim());
            const isEditing = editingId === r.id;
            const dateText = r.createdAtISO.slice(0, 10).replace(/-/g, ".");
            return (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-transparent px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="muted">{r.productType}</Badge>
                      <p className="truncate text-sm font-semibold text-white/90">{r.productTitle}</p>
                      {hasReply ? <Badge tone="success">답변 완료</Badge> : <Badge tone="neutral">미답변</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {dateText} · {r.authorName} · {r.rating}점
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={closeEditor} disabled={savingId === r.id}>
                          취소
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => saveReply(r.id)}
                          disabled={savingId === r.id}
                        >
                          {savingId === r.id ? "저장 중..." : "저장"}
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEditor(r)}>
                        {hasReply ? "답글 수정" : "답글 달기"}
                      </Button>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm text-white/70 leading-relaxed whitespace-pre-line">{r.content}</p>

                {hasReply ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-transparent px-4 py-3">
                    <p className="text-xs font-medium text-white/70">선생님 답글</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-white/80">{r.teacherReply}</p>
                    {r.teacherReplyAtISO ? (
                      <p className="mt-2 text-[11px] text-white/40">
                        {new Date(r.teacherReplyAtISO).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <Field label="답글">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={4}
                        placeholder="리뷰에 대한 답글을 입력하세요. (비우고 저장하면 답글이 삭제됩니다)"
                        className="bg-transparent"
                      />
                    </Field>
                    <p className="text-xs text-white/45">팁: 답글을 비우고 저장하면 “미답변” 상태로 돌아갑니다.</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

