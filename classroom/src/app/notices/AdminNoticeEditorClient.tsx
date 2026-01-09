"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  defaultCategory: string;
  categorySuggestions: string[];
  selectedCategory?: string;
  returnTo: string;
};

export default function AdminNoticeEditorClient({
  defaultCategory,
  categorySuggestions,
  selectedCategory,
  returnTo,
}: Props) {
  const router = useRouter();

  const normalizeCategory = (s: string) => (s || "").replace(/\s+/g, " ").trim().normalize("NFC");

  const { categoryOptions, categoryNormSet, categoryNormToValue } = useMemo(() => {
    const map = new Map<string, string>();
    for (const raw of categorySuggestions || []) {
      if (typeof raw !== "string") continue;
      const norm = normalizeCategory(raw);
      if (!norm) continue;
      if (!map.has(norm)) map.set(norm, norm);
    }
    const opts = Array.from(map.values());
    return { categoryOptions: opts, categoryNormSet: new Set(map.keys()), categoryNormToValue: map };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySuggestions.join("|")]);

  const getPreferredCategory = () => {
    const sel = typeof selectedCategory === "string" ? normalizeCategory(selectedCategory) : "";
    if (sel && categoryNormToValue.has(sel)) return categoryNormToValue.get(sel) as string;
    const def = normalizeCategory(defaultCategory || "");
    if (def && categoryNormToValue.has(def)) return categoryNormToValue.get(def) as string;
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
    // 카테고리 옵션/선택 게시판이 바뀌면 기본 선택값을 동기화
    setCategory(getPreferredCategory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, defaultCategory, categoryOptions.join("|")]);

  useEffect(() => {
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
  }, []);

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

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const q = quillRef.current;
      const body = q ? String(q.root?.innerHTML || "").trim() : "";
      const categoryTrim = normalizeCategory(category);
      const titleTrim = title.trim();
      if (!categoryTrim || !categoryNormSet.has(categoryTrim) || !titleTrim || !body || body === "<p><br></p>") {
        setError("카테고리(선택)/제목/내용을 모두 입력해주세요.");
        return;
      }

      const fd = new FormData();
      fd.set("category", categoryTrim);
      fd.set("title", titleTrim);
      fd.set("body", body);
      fd.set("isPublished", isPublished ? "1" : "0");

      const res = await fetch("/api/admin/notices/create", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `CREATE_FAILED_${res.status}`);
      }

      const j = await res.json().catch(() => null);
      if (!j?.ok) throw new Error(j?.error || "CREATE_FAILED");

      reset();
      router.push(returnTo);
    } catch {
      setError("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* 문서 편집형 상단 바 (메타 + 액션) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
            aria-label="카테고리"
          >
            {categoryOptions.length === 0 ? <option value="">카테고리가 없습니다</option> : null}
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={isPublished ? "1" : "0"}
            onChange={(e) => setIsPublished(e.target.value === "1")}
            className="h-9 rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
            aria-label="공개 여부"
          >
            <option value="1">공개</option>
            <option value="0">비공개</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="px-3 py-2 text-sm font-semibold text-white/90 hover:text-white disabled:opacity-60"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
          <Link
            href={returnTo}
            className="px-3 py-2 text-sm font-semibold text-white/80 hover:text-white"
          >
            목록으로
          </Link>
        </div>
      </div>

      {/* 문서 제목 */}
      <div className="mt-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full bg-transparent text-[28px] md:text-[34px] font-bold tracking-[-0.02em] text-white/95 outline-none placeholder:text-white/30"
        />
        <div className="mt-4 h-px w-full bg-white/10" />
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
              min-height: 320px;
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
    </div>
  );
}

