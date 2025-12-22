"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAllCoursesTestModeFromAllParam, withAllParamIfNeeded } from "@/lib/test-mode";

type QnaImage = {
  id: string;
  attachmentId: string;
  mimeType: string;
  title: string;
};

type QnaPost = {
  id: string;
  parentId: string | null;
  authorRole: "STUDENT" | "TEACHER";
  user: { id: string; email: string };
  body: string;
  deletedAt: string | null;
  pinnedAt: string | null;
  pinnedBy: { id: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  images: QnaImage[];
};

type Props = {
  lessonId: string;
  isTeacher: boolean;
  currentUserEmail: string;
};

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.slice(0, 2);
  return `${head}${"*".repeat(Math.max(0, name.length - 2))}@${domain}`;
}

function fmtKst(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function LessonQna({ lessonId, isTeacher, currentUserEmail }: Props) {
  const searchParams = useSearchParams();
  const allowAll = isAllCoursesTestModeFromAllParam(searchParams.get("all"));
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<QnaPost[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      });
    };
  }, [files]);

  const canSubmit = body.trim().length > 0 && !posting;

  const threads = useMemo(() => {
    const roots = posts.filter((p) => !p.parentId);
    const byParent = new Map<string, QnaPost[]>();
    for (const p of posts) {
      if (!p.parentId) continue;
      const arr = byParent.get(p.parentId) ?? [];
      arr.push(p);
      byParent.set(p.parentId, arr);
    }
    roots.sort((a, b) => {
      const ap = a.pinnedAt ? 1 : 0;
      const bp = b.pinnedAt ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b.createdAt.localeCompare(a.createdAt);
    });
    for (const [k, arr] of byParent.entries()) {
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      byParent.set(k, arr);
    }
    return { roots, byParent };
  }, [posts]);

  async function refresh() {
    setLoading(true);
    setError(null);
    const res = await fetch(withAllParamIfNeeded(`/api/qna/${lessonId}`, allowAll), { method: "GET" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setLoading(false);
      setError("Q&A를 불러오지 못했습니다.");
      return;
    }
    setPosts(data.posts as QnaPost[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function uploadImages(): Promise<string[]> {
    const ids: string[] = [];
    for (const f of files.slice(0, 5)) {
      const form = new FormData();
      form.set("lessonId", lessonId);
      form.set("file", f);
      const res = await fetch(withAllParamIfNeeded("/api/qna/upload", allowAll), { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("UPLOAD_FAILED");
      ids.push(data.attachmentId);
    }
    return ids;
  }

  async function submit() {
    if (posting) return;
    if (!body.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const attachmentIds = files.length ? await uploadImages() : [];
      const res = await fetch(withAllParamIfNeeded(`/api/qna/${lessonId}`, allowAll), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim(), attachmentIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("POST_FAILED");
      setBody("");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
    } catch {
      setError("등록에 실패했습니다.");
    } finally {
      setPosting(false);
    }
  }

  async function submitReply(parentId: string) {
    if (!isTeacher) return;
    const bodyTrim = replyBody.trim();
    if (!bodyTrim) {
      setError("답변 내용을 입력해 주세요.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(withAllParamIfNeeded(`/api/qna/${lessonId}`, allowAll), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: bodyTrim, attachmentIds: [], parentId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("REPLY_FAILED");
      setReplyToId(null);
      setReplyBody("");
      await refresh();
    } catch {
      setError("답변 등록에 실패했습니다.");
    } finally {
      setPosting(false);
    }
  }

  async function togglePin(postId: string) {
    const res = await fetch(withAllParamIfNeeded(`/api/qna/post/${postId}/pin`, allowAll), { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError("고정 처리에 실패했습니다.");
      return;
    }
    await refresh();
  }

  async function remove(postId: string) {
    if (!confirm("삭제할까요?")) return;
    const res = await fetch(withAllParamIfNeeded(`/api/qna/post/${postId}`, allowAll), { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError("삭제에 실패했습니다.");
      return;
    }
    await refresh();
  }

  async function startEdit(p: QnaPost) {
    setEditingId(p.id);
    setEditBody(p.body);
  }

  async function saveEdit(postId: string) {
    const next = editBody.trim();
    if (!next) return;
    const res = await fetch(withAllParamIfNeeded(`/api/qna/post/${postId}`, allowAll), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: next }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setError("수정에 실패했습니다.");
      return;
    }
    setEditingId(null);
    setEditBody("");
    await refresh();
  }

  return (
    <div className="pt-6">
      <div className="rounded-2xl border border-white/10 bg-[#1d1d1f] p-4">
        <p className="text-sm font-semibold">질문 작성</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-3 h-28 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/10"
          placeholder="궁금한 점을 남겨주세요. (이미지 첨부 가능)"
        />

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
              className="text-xs text-white/70"
            />
            {files.length ? <span className="text-xs text-white/50">{files.length}개 선택</span> : null}
          </div>

          <button
            type="button"
            disabled={posting}
            onClick={() => void submit()}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50 ${
              canSubmit ? "bg-white/15" : "bg-white/10"
            }`}
          >
            {posting ? "등록 중..." : "등록"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        {files.length ? (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {files.map((f, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${f.name}-${f.size}-${f.lastModified}`}
                src={previewUrls[idx] || ""}
                alt={f.name}
                className="aspect-square w-full rounded-lg border border-white/10 object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-white/60">불러오는 중...</p>
        ) : threads.roots.length === 0 ? (
          <p className="text-sm text-white/60">아직 등록된 질문이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {threads.roots.map((p) => {
              const mine = p.user.email.toLowerCase() === currentUserEmail.toLowerCase();
              const canManage = mine || isTeacher;
              const isEditing = editingId === p.id;
              const replies = threads.byParent.get(p.id) ?? [];
              return (
                <li key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                        {p.pinnedAt ? <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">고정</span> : null}
                        {p.authorRole === "TEACHER" ? (
                          <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-sky-200">선생님</span>
                        ) : null}
                        <span>{maskEmail(p.user.email)}</span>
                        <span>·</span>
                        <span>{fmtKst(p.createdAt)}</span>
                        {p.updatedAt !== p.createdAt ? <span className="text-white/40">(수정됨)</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isTeacher ? (
                        <button
                          type="button"
                          onClick={() => void togglePin(p.id)}
                          className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        >
                          {p.pinnedAt ? "고정해제" : "고정"}
                        </button>
                      ) : null}
                      {canManage && !p.deletedAt ? (
                        <>
                          {mine ? (
                            <button
                              type="button"
                              onClick={() => void startEdit(p)}
                              className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                            >
                              수정
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void remove(p.id)}
                            className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                          >
                            삭제
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {p.deletedAt ? (
                    <p className="mt-3 text-sm text-white/50">삭제된 글입니다.</p>
                  ) : (
                    <>
                      {isEditing ? (
                        <div className="mt-3">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="h-28 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/10"
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditBody("");
                              }}
                              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveEdit(p.id)}
                              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/80">{p.body}</p>
                      )}
                      {p.images.length ? (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {p.images.map((img) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={img.id}
                              src={withAllParamIfNeeded(`/api/attachments/${img.attachmentId}/view`, allowAll)}
                              alt={img.title}
                              className="aspect-square w-full rounded-xl border border-white/10 object-cover"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      ) : null}

                      {/* 답변(선생님 전용) */}
                      <div className="mt-4 border-t border-white/10 pt-4">
                        {replies.length ? (
                          <div className="space-y-3">
                            {replies.map((r) => {
                              const mineReply = r.user.email.toLowerCase() === currentUserEmail.toLowerCase();
                              const canManageReply = mineReply || isTeacher;
                              const isEditingReply = editingId === r.id;
                              return (
                                <div key={r.id} className="rounded-xl border border-white/10 bg-[#1d1d1f] p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                                        <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-sky-200">
                                          {r.authorRole === "TEACHER" ? "선생님 답변" : "답글"}
                                        </span>
                                        <span>{maskEmail(r.user.email)}</span>
                                        <span>·</span>
                                        <span>{fmtKst(r.createdAt)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {canManageReply && !r.deletedAt ? (
                                        <>
                                          {mineReply ? (
                                            <button
                                              type="button"
                                              onClick={() => void startEdit(r)}
                                              className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                                            >
                                              수정
                                            </button>
                                          ) : null}
                                          <button
                                            type="button"
                                            onClick={() => void remove(r.id)}
                                            className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                                          >
                                            삭제
                                          </button>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>

                                  {r.deletedAt ? (
                                    <p className="mt-2 text-sm text-white/50">삭제된 글입니다.</p>
                                  ) : isEditingReply ? (
                                    <div className="mt-2">
                                      <textarea
                                        value={editBody}
                                        onChange={(e) => setEditBody(e.target.value)}
                                        className="h-24 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/10"
                                      />
                                      <div className="mt-2 flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingId(null);
                                            setEditBody("");
                                          }}
                                          className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                                        >
                                          취소
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void saveEdit(r.id)}
                                          className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                                        >
                                          저장
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/80">{r.body}</p>
                                      {r.images.length ? (
                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                          {r.images.map((img) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              key={img.id}
                                              src={withAllParamIfNeeded(`/api/attachments/${img.attachmentId}/view`, allowAll)}
                                              alt={img.title}
                                              className="aspect-square w-full rounded-xl border border-white/10 object-cover"
                                              loading="lazy"
                                            />
                                          ))}
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {isTeacher ? (
                          <div className="mt-3">
                            {replyToId === p.id ? (
                              <>
                                <textarea
                                  value={replyBody}
                                  onChange={(e) => setReplyBody(e.target.value)}
                                  className="h-24 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/10"
                                  placeholder="선생님 답변을 작성해 주세요."
                                />
                                <div className="mt-2 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyToId(null);
                                      setReplyBody("");
                                    }}
                                    className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                                  >
                                    취소
                                  </button>
                                  <button
                                    type="button"
                                    disabled={posting}
                                    onClick={() => void submitReply(p.id)}
                                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                                  >
                                    답변 등록
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyToId(p.id);
                                  setReplyBody("");
                                }}
                                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                              >
                                답변하기
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}


