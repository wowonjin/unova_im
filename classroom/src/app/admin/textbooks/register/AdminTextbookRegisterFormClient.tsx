"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generatePdfFirstPageThumbDataUrl, getPdfPageCount } from "@/app/_components/pdfFirstPageThumbCache";

type RegisterLogEntryV1 = {
  v: 1;
  createdAt: number;
  textbookId?: string | null;
  title: string;
  urls: string[];
  sizeBytes?: number | null;
  pageCount?: number | null;
  thumbnailDataUrl?: string | null;
};

function parseUrls(urlText: string): string[] {
  return (urlText ?? "")
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function guessTitleFromUrls(urlText: string): string {
  const urls = (urlText ?? "")
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const first = urls[0];
  if (!first) return "";
  try {
    const u = new URL(first);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const decoded = decodeURIComponent(last);
    const noExt = decoded.replace(/\.[a-z0-9]{1,8}(\?|$)/i, "").trim();
    return noExt.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function firstUrlFromText(urlText: string): string | null {
  const first = (urlText ?? "")
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!first) return null;
  return first;
}

function formatBytes(bytes: number): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[i]}`;
}

export default function AdminTextbookRegisterFormClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [entitlementDays, setEntitlementDays] = useState("30");
  const [url, setUrl] = useState("");
  const titleTouched = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const inferred = useMemo(() => guessTitleFromUrls(url), [url]);

  useEffect(() => {
    if (titleTouched.current) return;
    if (!inferred) return;
    setTitle(inferred);
  }, [inferred]);

  const [metaStatus, setMetaStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [metaError, setMetaError] = useState<string | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const first = firstUrlFromText(url);
    if (!first) {
      setMetaStatus("idle");
      setMetaError(null);
      setSizeBytes(null);
      setPageCount(null);
      setProxyUrl(null);
      setThumbnailDataUrl(null);
      return;
    }

    let alive = true;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setMetaStatus("loading");
      setMetaError(null);
      setThumbnailDataUrl(null);
      try {
        const res = await fetch(`/api/admin/textbooks/url-metadata?url=${encodeURIComponent(first)}`, {
          method: "GET",
          headers: { accept: "application/json" },
          signal: ac.signal,
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; sizeBytes: number; pageCount: number | null; proxyUrl: string }
          | { ok: false; error?: string };
        if (!alive) return;
        if (!res.ok || !data || (data as any).ok !== true) {
          setMetaStatus("error");
          setMetaError((data as any)?.error || "META_FAILED");
          setSizeBytes(null);
          setPageCount(null);
          setProxyUrl(null);
          return;
        }

        setSizeBytes(typeof data.sizeBytes === "number" ? data.sizeBytes : 0);
        setPageCount(null);
        setProxyUrl(data.proxyUrl);

        const [thumb, pages] = await Promise.all([
          generatePdfFirstPageThumbDataUrl({ src: data.proxyUrl, targetWidth: 300 }),
          getPdfPageCount({ src: data.proxyUrl }),
        ]);
        if (!alive) return;
        setThumbnailDataUrl(thumb);
        setPageCount(Number.isFinite(pages) && pages > 0 ? pages : null);
        setMetaStatus("ready");
      } catch (e: any) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setMetaStatus("error");
        setMetaError("META_EXCEPTION");
      }
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [url]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/textbooks/register", {
        method: "POST",
        headers: { accept: "application/json", "x-unova-client": "1" },
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; textbookId?: string | null }
        | { ok: false; error?: string };

      if (!res.ok || !data || (data as any).ok !== true) {
        // Handle error
      } else {
        // 등록 기록은 DB 기준으로 노출하므로(router.refresh로 갱신), 별도의 sessionStorage 로그는 남기지 않습니다.
      }

      router.refresh();
      setUrl("");
      setTitle("");
      titleTouched.current = false;
      setMetaStatus("idle");
      setSizeBytes(null);
      setPageCount(null);
      setThumbnailDataUrl(null);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  const urlCount = parseUrls(url).length;

  return (
    <div className="space-y-6">
      {/* Main Form Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* URL Input Section */}
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-white mb-2">
                  구글 스토리지 URL
                  {urlCount > 1 && (
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-white/50">
                      {urlCount}개 파일
                    </span>
                  )}
                </label>
                <textarea
                  name="url"
                  required
                  rows={3}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/bucket/file.pdf"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-white/20 focus:bg-white/[0.05] resize-none font-mono"
                />
                <p className="mt-2 text-xs text-white/35">
                  여러 URL을 줄바꿈으로 구분하면 한 번에 등록할 수 있습니다
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section - Show when URL is entered */}
          {url.trim() && (
            <div className="p-6 border-b border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-start gap-5">
                {/* Thumbnail */}
                <div className="shrink-0 w-20 h-28 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0b]">
                  {thumbnailDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {metaStatus === "loading" ? (
                        <svg className="w-5 h-5 text-white/20 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : metaStatus === "error" ? (
                        <svg className="w-5 h-5 text-red-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    {metaStatus === "loading" && (
                      <span className="text-white/40">파일 정보 불러오는 중...</span>
                    )}
                    {metaStatus === "ready" && (
                      <span className="flex items-center gap-1.5 text-emerald-400/70">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        파일 정보 확인됨
                      </span>
                    )}
                    {metaStatus === "error" && (
                      <span className="text-red-400/70">불러오기 실패: {metaError}</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-white/30 mb-0.5">용량</div>
                      <div className="text-sm font-medium text-white/70">
                        {sizeBytes == null ? "—" : formatBytes(sizeBytes)}
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-white/30 mb-0.5">페이지</div>
                      <div className="text-sm font-medium text-white/70">
                        {pageCount == null ? "—" : `${pageCount}쪽`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">교재 제목</label>
                <input
                  name="title"
                  required
                  value={title}
                  onChange={(e) => {
                    titleTouched.current = true;
                    setTitle(e.target.value);
                  }}
                  placeholder="URL에서 자동 추출됩니다"
                  className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-white/20 focus:bg-white/[0.05]"
                />
                <p className="mt-1.5 text-xs text-white/30">파일명에서 자동 추출되며 수정 가능합니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">이용 기간</label>
                <div className="relative">
                  <input
                    name="entitlementDays"
                    type="number"
                    min={1}
                    max={3650}
                    value={entitlementDays}
                    onChange={(e) => setEntitlementDays(e.target.value)}
                    className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 pr-12 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-white/20 focus:bg-white/[0.05]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">일</span>
                </div>
                <p className="mt-1.5 text-xs text-white/30">구매 후 다운로드 가능 기간</p>
              </div>
            </div>

            {/* Hidden inputs */}
            <input type="hidden" name="isPublished" value="1" />
            <input type="hidden" name="pageCount" value={pageCount != null ? String(pageCount) : ""} />
            <input type="hidden" name="thumbnailDataUrl" value={thumbnailDataUrl || ""} />

            {/* Submit */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-white/35">
                등록 후 판매 물품에서 가격을 설정할 수 있습니다
              </p>
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    등록 중...
                  </>
                ) : (
                  "교재 등록"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400/70">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-xs text-white/40 leading-relaxed">
            <strong className="text-white/50">팁:</strong> 교재 등록 후 
            <a href="/admin/textbooks" className="text-white/60 hover:text-white/80 underline underline-offset-2 mx-1">판매 물품</a>
            페이지에서 가격을 설정하면 스토어에서 판매할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
