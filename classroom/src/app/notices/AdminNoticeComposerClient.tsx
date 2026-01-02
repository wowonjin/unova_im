"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  isAdmin: boolean;
  defaultCategory: string;
  categorySuggestions: string[];
  selectedCategory?: string;
};

export default function AdminNoticeComposerClient({
  isAdmin,
  defaultCategory,
  categorySuggestions,
  selectedCategory,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const categoryOptions = useMemo(() => {
    const set = new Set(
      (categorySuggestions || [])
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter((x) => x.length > 0),
    );
    return Array.from(set);
  }, [categorySuggestions]);

  const getPreferredCategory = () => {
    const sel = typeof selectedCategory === "string" ? selectedCategory.trim() : "";
    if (sel && categoryOptions.includes(sel)) return sel;
    const def = (defaultCategory || "").trim();
    if (def && categoryOptions.includes(def)) return def;
    return categoryOptions[0] ?? "";
  };

  const [category, setCategory] = useState<string>(() => "");
  const [title, setTitle] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    // 카테고리 옵션/선택 게시판이 바뀌면(예: 다른 게시판으로 이동) 기본 선택값을 동기화
    setCategory(getPreferredCategory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, defaultCategory, categoryOptions.join("|")]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      if (quillRef.current) return;
      // Turbopack 환경에서 `import("quill")` 해석이 실패할 수 있어 CDN으로 로드합니다.
      const loadQuill = async (): Promise<any> => {
        const w = window as any;
        if (w.Quill) return w.Quill;
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[data-quill="1"]') as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("QUILL_SCRIPT_LOAD_FAILED")));
            return;
          }
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js";
          s.async = true;
          s.setAttribute("data-quill", "1");
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("QUILL_SCRIPT_LOAD_FAILED"));
          document.head.appendChild(s);
        });
        return (window as any).Quill;
      };

      const Quill = await loadQuill();
      if (cancelled) return;
      if (!editorHostRef.current) return;

      const q = new Quill(editorHostRef.current, {
        theme: "snow",
        placeholder: "공지 내용을 입력하세요",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "link", "image"],
            [{ color: [] }],
            ["clean"],
          ],
        },
      });

      quillRef.current = q;
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!isAdmin) return null;

  const reset = () => {
    setCategory(getPreferredCategory());
    setTitle("");
    setIsPublished(true);
    setError(null);
    try {
      const q = quillRef.current;
      if (q) q.setContents([]);
    } catch {
      // ignore
    }
  };

  const close = () => {
    // 모달이 닫히면 Quill DOM이 언마운트되므로 인스턴스 참조도 같이 리셋해야
    // 다음에 다시 열었을 때 정상적으로 재초기화됩니다.
    try {
      if (editorHostRef.current) editorHostRef.current.innerHTML = "";
    } catch {
      // ignore
    }
    quillRef.current = null;
    setOpen(false);
    setError(null);
  };

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const q = quillRef.current;
      const body = q ? String(q.root?.innerHTML || "").trim() : "";
      const categoryTrim = category.trim();
      if (!categoryTrim || !categoryOptions.includes(categoryTrim) || !title.trim() || !body || body === "<p><br></p>") {
        setError("카테고리(선택)/제목/내용을 모두 입력해주세요.");
        return;
      }

      const fd = new FormData();
      fd.set("category", categoryTrim);
      fd.set("title", title.trim());
      fd.set("body", body);
      fd.set("isPublished", isPublished ? "1" : "0");

      const res = await fetch("/api/admin/notices/create", {
        method: "POST",
        body: fd,
        redirect: "follow",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "CREATE_FAILED");
      }

      close();
      reset();
      // 목록 새로고침 (작성 직후 새 글이 목록에 뜨도록)
      router.refresh();
    } catch (e) {
      setError("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCategory(getPreferredCategory());
          setOpen(true);
        }}
        className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
      >
        글 작성하기
      </button>

      {open ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={close} />

          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#161616] p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">공지사항 작성</h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-white/70">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                >
                  {categoryOptions.length === 0 ? <option value="">카테고리가 없습니다</option> : null}
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-white/70">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  placeholder="예: 12/20 휴강 안내"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-white/70">공개</label>
                <select
                  value={isPublished ? "1" : "0"}
                  onChange={(e) => setIsPublished(e.target.value === "1")}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                >
                  <option value="1">공개</option>
                  <option value="0">비공개</option>
                </select>
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

            <div className="mt-4">
              {/* Quill 다크 모드 오버라이드 (snow 테마 기반) */}
              <style
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: `
                  .unova-quill-dark .ql-toolbar.ql-snow {
                    background: #1a1a1c;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-bottom: 0;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                  }
                  .unova-quill-dark .ql-container.ql-snow {
                    background: #1a1a1c;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-top: 0;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    color: rgba(255,255,255,0.92);
                  }
                  .unova-quill-dark .ql-editor {
                    min-height: 280px;
                    color: rgba(255,255,255,0.92);
                  }
                  .unova-quill-dark .ql-editor.ql-blank::before {
                    color: rgba(255,255,255,0.35);
                  }
                  .unova-quill-dark .ql-snow .ql-picker {
                    color: rgba(255,255,255,0.85);
                  }
                  .unova-quill-dark .ql-snow .ql-picker-options {
                    background: #1a1a1c;
                    border: 1px solid rgba(255,255,255,0.12);
                  }
                  .unova-quill-dark .ql-snow .ql-tooltip {
                    background: #1a1a1c;
                    border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.9);
                  }
                  .unova-quill-dark .ql-snow .ql-tooltip input[type="text"] {
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.16);
                    color: rgba(255,255,255,0.92);
                  }
                  .unova-quill-dark .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.82); }
                  .unova-quill-dark .ql-snow .ql-fill { fill: rgba(255,255,255,0.82); }
                  .unova-quill-dark .ql-snow .ql-picker-label { color: rgba(255,255,255,0.82); }
                  .unova-quill-dark .ql-snow .ql-picker-label .ql-stroke { stroke: rgba(255,255,255,0.82); }
                  .unova-quill-dark .ql-snow .ql-active .ql-stroke { stroke: rgba(255,255,255,1); }
                  .unova-quill-dark .ql-snow .ql-active .ql-fill { fill: rgba(255,255,255,1); }
                  .unova-quill-dark .ql-snow .ql-toolbar button:hover,
                  .unova-quill-dark .ql-snow .ql-toolbar button:focus {
                    background: rgba(255,255,255,0.08);
                    border-radius: 8px;
                  }
                  .unova-quill-dark .ql-snow .ql-toolbar button.ql-active {
                    background: rgba(255,255,255,0.12);
                    border-radius: 8px;
                  }
                `,
                }}
              />

              <div className="unova-quill-dark rounded-xl">
                <div ref={editorHostRef} />
              </div>
              <p className="mt-2 text-xs text-white/50">※ 이미지 업로드는 URL 삽입 방식입니다.</p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                초기화
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmit}
                className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
              >
                {submitting ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


