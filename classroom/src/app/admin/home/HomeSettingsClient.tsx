"use client";

import { useEffect, useMemo, useState } from "react";

type HomeSlide = {
  id: string;
  position: number;
  isActive: boolean;
  imageUrl: string;
  linkUrl: string | null;
  tag: string | null;
  titleHtml: string;
  subtitle: string | null;
  createdAt: string;
};

type HomeShortcut = {
  id: string;
  position: number;
  isActive: boolean;
  label: string;
  imageUrl: string;
  linkUrl: string;
  bgColor: string | null;
  createdAt: string;
};

type TabKey = "slides" | "shortcuts";

function normalizeTitleToHtml(input: string): string {
  // 사용자가 줄바꿈으로 입력했을 때 <br>로 변환
  // 보안/안정성: HTML을 그대로 저장하면 XSS 및 hydration mismatch(마크업 깨짐)가 발생할 수 있으므로
  // 사용자가 입력한 텍스트는 HTML escape 후 <br>만 허용합니다.
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((s) => escapeHtml(s.trimEnd()))
    .join("<br>");
}

export default function HomeSettingsClient() {
  const [tab, setTab] = useState<TabKey>("slides");

  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [shortcuts, setShortcuts] = useState<HomeShortcut[]>([]);

  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [isLoadingShortcuts, setIsLoadingShortcuts] = useState(true);
  const [errorSlides, setErrorSlides] = useState<string | null>(null);
  const [errorShortcuts, setErrorShortcuts] = useState<string | null>(null);

  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [slideForm, setSlideForm] = useState({
    imageUrl: "",
    linkUrl: "",
    tag: "",
    title: "",
    subtitle: "",
    position: "0",
  });

  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [showShortcutForm, setShowShortcutForm] = useState(false);
  const [shortcutForm, setShortcutForm] = useState({
    label: "",
    imageUrl: "",
    linkUrl: "",
    bgColor: "",
    position: "0",
  });

  const refreshSlides = async () => {
    setIsLoadingSlides(true);
    setErrorSlides(null);
    try {
      const res = await fetch("/api/admin/home-slides/list", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error("FETCH_FAILED");
      setSlides(Array.isArray(json.slides) ? json.slides : []);
    } catch {
      setSlides([]);
      setErrorSlides("슬라이드 목록을 불러오지 못했습니다. (DB 마이그레이션이 아직 적용되지 않았을 수 있습니다.)");
    } finally {
      setIsLoadingSlides(false);
    }
  };

  const refreshShortcuts = async () => {
    setIsLoadingShortcuts(true);
    setErrorShortcuts(null);
    try {
      const res = await fetch("/api/admin/home-shortcuts/list", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error("FETCH_FAILED");
      setShortcuts(Array.isArray(json.shortcuts) ? json.shortcuts : []);
    } catch {
      setShortcuts([]);
      setErrorShortcuts("바로가기 아이콘 목록을 불러오지 못했습니다. (DB 마이그레이션이 아직 적용되지 않았을 수 있습니다.)");
    } finally {
      setIsLoadingShortcuts(false);
    }
  };

  useEffect(() => {
    refreshSlides();
    refreshShortcuts();
  }, []);

  const extractApiErrorMessage = async (res: Response): Promise<string> => {
    const status = res.status;
    const json = await res.json().catch(() => null);
    const code = json?.error ? String(json.error) : null;
    // zod issues가 있으면 첫 메시지라도 노출
    const issueMsg =
      Array.isArray(json?.issues) && json.issues.length > 0 && json.issues[0]?.message
        ? String(json.issues[0].message)
        : null;
    const issuePath =
      Array.isArray(json?.issues) && json.issues.length > 0 && Array.isArray(json.issues[0]?.path)
        ? String(json.issues[0].path.join("."))
        : null;

    if (code && issueMsg && issuePath) return `${code} (${issuePath}: ${issueMsg}) [${status}]`;
    if (code && issueMsg) return `${code} (${issueMsg}) [${status}]`;
    if (code) return `${code} [${status}]`;
    return `HTTP_${status}`;
  };

  const slideFormTitle = useMemo(() => (editingSlideId ? "슬라이드 수정" : "새 슬라이드 추가"), [editingSlideId]);
  const shortcutFormTitle = useMemo(
    () => (editingShortcutId ? "아이콘 수정" : "새 아이콘 추가"),
    [editingShortcutId]
  );

  const toggleSlideActive = async (id: string, next: boolean) => {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("isActive", next ? "1" : "0");
    const res = await fetch("/api/admin/home-slides/update", { method: "POST", body: fd });
    if (!res.ok) {
      alert(`변경에 실패했습니다. (${await extractApiErrorMessage(res)})`);
      return;
    }
    await refreshSlides();
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const fd = new FormData();
    fd.append("id", id);
    const res = await fetch("/api/admin/home-slides/delete", { method: "POST", body: fd });
    if (!res.ok) {
      alert(`삭제에 실패했습니다. (${await extractApiErrorMessage(res)})`);
      return;
    }
    await refreshSlides();
  };

  const submitSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("imageUrl", slideForm.imageUrl);
    fd.append("linkUrl", slideForm.linkUrl);
    fd.append("tag", slideForm.tag);
    fd.append("titleHtml", normalizeTitleToHtml(slideForm.title));
    fd.append("subtitle", slideForm.subtitle);
    fd.append("position", slideForm.position);
    const url = editingSlideId ? "/api/admin/home-slides/update" : "/api/admin/home-slides/create";
    if (editingSlideId) fd.append("id", editingSlideId);

    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      alert(`저장에 실패했습니다. (${await extractApiErrorMessage(res)})`);
      return;
    }
    setShowSlideForm(false);
    setEditingSlideId(null);
    setSlideForm({ imageUrl: "", linkUrl: "", tag: "", title: "", subtitle: "", position: "0" });
    await refreshSlides();
  };

  const startEditSlide = (s: HomeSlide) => {
    setTab("slides");
    setEditingSlideId(s.id);
    setShowSlideForm(true);
    setSlideForm({
      imageUrl: s.imageUrl,
      linkUrl: s.linkUrl || "",
      tag: s.tag || "",
      title: (s.titleHtml || "").replace(/<br\s*\/?>/gi, "\n"),
      subtitle: s.subtitle || "",
      position: String(s.position ?? 0),
    });
  };

  const toggleShortcutActive = async (id: string, next: boolean) => {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("isActive", next ? "1" : "0");
    const res = await fetch("/api/admin/home-shortcuts/update", { method: "POST", body: fd });
    if (!res.ok) {
      alert(`변경에 실패했습니다. (${await extractApiErrorMessage(res)})`);
      return;
    }
    await refreshShortcuts();
  };

  const deleteShortcut = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const fd = new FormData();
    fd.append("id", id);
    const res = await fetch("/api/admin/home-shortcuts/delete", { method: "POST", body: fd });
    if (!res.ok) {
      alert(`삭제에 실패했습니다. (${await extractApiErrorMessage(res)})`);
      return;
    }
    await refreshShortcuts();
  };

  const submitShortcut = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("label", shortcutForm.label);
    fd.append("imageUrl", shortcutForm.imageUrl);
    fd.append("linkUrl", shortcutForm.linkUrl);
    fd.append("bgColor", shortcutForm.bgColor);
    fd.append("position", shortcutForm.position);
    const url = editingShortcutId ? "/api/admin/home-shortcuts/update" : "/api/admin/home-shortcuts/create";
    if (editingShortcutId) fd.append("id", editingShortcutId);

    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      alert(`저장에 실패했습니다. (${await extractApiErrorMessage(res)})`);
      return;
    }
    setShowShortcutForm(false);
    setEditingShortcutId(null);
    setShortcutForm({ label: "", imageUrl: "", linkUrl: "", bgColor: "", position: "0" });
    await refreshShortcuts();
  };

  const startEditShortcut = (s: HomeShortcut) => {
    setTab("shortcuts");
    setEditingShortcutId(s.id);
    setShowShortcutForm(true);
    setShortcutForm({
      label: s.label,
      imageUrl: s.imageUrl,
      linkUrl: s.linkUrl,
      bgColor: s.bgColor || "",
      position: String(s.position ?? 0),
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[28px] font-bold tracking-tight">메인페이지 설정</h1>
        {tab === "slides" && (
          <button
            onClick={() => {
              setShowSlideForm((v) => !v);
              setEditingSlideId(null);
              setSlideForm({ imageUrl: "", linkUrl: "", tag: "", title: "", subtitle: "", position: "0" });
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              add
            </span>
            새 슬라이드
          </button>
        )}
        {tab === "shortcuts" && (
          <button
            onClick={() => {
              setShowShortcutForm((v) => !v);
              setEditingShortcutId(null);
              setShortcutForm({ imageUrl: "", label: "", linkUrl: "", bgColor: "", position: "0" });
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              add
            </span>
            새 아이콘
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("slides")}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
            tab === "slides" ? "bg-white text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
          }`}
        >
          메인 슬라이드
        </button>
        <button
          type="button"
          onClick={() => setTab("shortcuts")}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
            tab === "shortcuts" ? "bg-white text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
          }`}
        >
          바로가기 아이콘
        </button>
      </div>

      {/* 슬라이드 탭 */}
      {tab === "slides" ? (
        <>
          {errorSlides ? (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
              {errorSlides}
            </div>
          ) : null}

          {showSlideForm ? (
            <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-[18px] font-semibold mb-6">{slideFormTitle}</h2>
              <form onSubmit={submitSlide} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">이미지 URL</label>
                    <input
                      value={slideForm.imageUrl}
                      onChange={(e) => setSlideForm({ ...slideForm, imageUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">클릭 링크(URL)</label>
                    <input
                      value={slideForm.linkUrl}
                      onChange={(e) => setSlideForm({ ...slideForm, linkUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="https://... 또는 /store"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">태그(선택)</label>
                    <input
                      value={slideForm.tag}
                      onChange={(e) => setSlideForm({ ...slideForm, tag: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="27학년도 수능대비"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">position(내림차순)</label>
                    <input
                      value={slideForm.position}
                      onChange={(e) => setSlideForm({ ...slideForm, position: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-white/50 mb-2">타이틀(줄바꿈 가능)</label>
                    <textarea
                      value={slideForm.title}
                      onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                      className="w-full min-h-[88px] px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder={"예)\n한 권으로 끝내는\n물리학I,II 방법론 교재"}
                      required
                    />
                    <p className="mt-2 text-[12px] text-white/40">
                      줄바꿈은 자동으로 <code className="text-white/60">&lt;br&gt;</code>로 변환됩니다.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[13px] text-white/50 mb-2">서브타이틀(선택)</label>
                    <input
                      value={slideForm.subtitle}
                      onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="CONNECT PHYSICS I, II"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSlideForm(false);
                      setEditingSlideId(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/70 font-medium hover:bg-white/[0.1] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {isLoadingSlides ? (
            <div className="py-12 text-center text-white/40">불러오는 중...</div>
          ) : slides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slides.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
                >
                  {/* 이미지 */}
                  <div className="w-full aspect-[16/9] bg-white/[0.05] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* 콘텐츠 */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          s.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {s.isActive ? "활성화" : "비활성화"}
                      </span>
                      <span className="text-[11px] text-white/40">pos: {s.position}</span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-white line-clamp-2 mb-2">
                      {(s.titleHtml || "").replace(/<br\s*\/?>/gi, " / ") || "제목 없음"}
                    </h3>
                    <div className="space-y-1 text-[12px] text-white/40">
                      <div className="truncate">{s.tag || "태그 없음"}</div>
                      <div className="truncate">{s.linkUrl || "링크 없음"}</div>
                    </div>
                  </div>
                  {/* 버튼 */}
                  <div className="flex items-center gap-2 p-4 pt-0">
                    <button
                      onClick={() => toggleSlideActive(s.id, !s.isActive)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                        s.isActive ? "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {s.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button
                      onClick={() => startEditSlide(s)}
                      className="flex-1 px-3 py-2 rounded-lg text-[12px] font-medium bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteSlide(s.id)}
                      className="p-2 rounded-lg bg-white/[0.06] text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="material-symbols-outlined text-white/20" style={{ fontSize: "48px" }}>
                slideshow
              </span>
              <p className="mt-4 text-[16px] font-medium text-white/60">등록된 슬라이드가 없습니다</p>
              <p className="mt-1 text-[14px] text-white/40">새 슬라이드를 추가해주세요</p>
            </div>
          )}
        </>
      ) : null}

      {/* 바로가기 아이콘 탭 */}
      {tab === "shortcuts" ? (
        <>
          {errorShortcuts ? (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
              {errorShortcuts}
            </div>
          ) : null}

          {showShortcutForm ? (
            <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-[18px] font-semibold mb-6">{shortcutFormTitle}</h2>
              <form onSubmit={submitShortcut} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">아이콘 이름</label>
                    <input
                      value={shortcutForm.label}
                      onChange={(e) => setShortcutForm({ ...shortcutForm, label: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="커넥트 소개"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">하이퍼링크(URL)</label>
                    <input
                      value={shortcutForm.linkUrl}
                      onChange={(e) => setShortcutForm({ ...shortcutForm, linkUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">이미지 URL</label>
                    <input
                      value={shortcutForm.imageUrl}
                      onChange={(e) => setShortcutForm({ ...shortcutForm, imageUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">배경색(선택)</label>
                    <input
                      value={shortcutForm.bgColor}
                      onChange={(e) => setShortcutForm({ ...shortcutForm, bgColor: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="#7c4ff5"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-white/50 mb-2">position(내림차순)</label>
                    <input
                      value={shortcutForm.position}
                      onChange={(e) => setShortcutForm({ ...shortcutForm, position: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="text-[13px] text-white/50">미리보기</div>
                    <div
                      className="h-10 w-10 rounded-xl border border-white/10"
                      style={{ backgroundColor: shortcutForm.bgColor?.trim() ? shortcutForm.bgColor.trim() : "#ffffff" }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowShortcutForm(false);
                      setEditingShortcutId(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/70 font-medium hover:bg-white/[0.1] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {isLoadingShortcuts ? (
            <div className="py-12 text-center text-white/40">불러오는 중...</div>
          ) : shortcuts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shortcuts.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
                >
                  {/* 아이콘 미리보기 */}
                  <div className="p-6 flex items-center justify-center bg-white/[0.02]">
                    <div
                      className="w-16 h-16 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: s.bgColor?.trim() ? s.bgColor.trim() : "#ffffff" }}
                      title={s.bgColor || ""}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.imageUrl} alt="" className="block w-full h-full object-cover" />
                    </div>
                  </div>
                  {/* 콘텐츠 */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          s.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {s.isActive ? "활성화" : "비활성화"}
                      </span>
                      <span className="text-[11px] text-white/40">pos: {s.position}</span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-white truncate mb-2">{s.label}</h3>
                    <div className="space-y-1 text-[12px] text-white/40">
                      <div className="truncate flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>link</span>
                        {s.linkUrl}
                      </div>
                      <div className="truncate flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>palette</span>
                        {s.bgColor || "-"}
                      </div>
                    </div>
                  </div>
                  {/* 버튼 */}
                  <div className="flex items-center gap-2 p-4 pt-0">
                    <button
                      onClick={() => toggleShortcutActive(s.id, !s.isActive)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                        s.isActive ? "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {s.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button
                      onClick={() => startEditShortcut(s)}
                      className="flex-1 px-3 py-2 rounded-lg text-[12px] font-medium bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteShortcut(s.id)}
                      className="p-2 rounded-lg bg-white/[0.06] text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="material-symbols-outlined text-white/20" style={{ fontSize: "48px" }}>
                apps
              </span>
              <p className="mt-4 text-[16px] font-medium text-white/60">등록된 아이콘이 없습니다</p>
              <p className="mt-1 text-[14px] text-white/40">새 아이콘을 추가해주세요</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}


