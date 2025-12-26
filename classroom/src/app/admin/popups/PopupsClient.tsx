"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Popup = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  position: "center" | "bottom-right";
  createdAt: string;
};

function toDateOnly(iso: string | null): string {
  if (!iso) return "";
  // ISO -> YYYY-MM-DD
  return iso.slice(0, 10);
}

function fromDateOnly(date: string): string {
  return date;
}

export default function PopupsClient() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    startDate: "",
    endDate: "",
    position: "center" as "center" | "bottom-right",
  });

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/popups/list", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error("FETCH_FAILED");
      const list: Popup[] = Array.isArray(json.popups) ? json.popups : [];
      setPopups(list);
    } catch {
      setError("팝업 목록을 불러오지 못했습니다. (DB 마이그레이션이 아직 적용되지 않았을 수 있습니다.)");
      setPopups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleActive = async (id: string, next: boolean) => {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("isActive", next ? "1" : "0");
    const res = await fetch("/api/admin/popups/update", { method: "POST", body: fd });
    if (!res.ok) {
      alert("변경에 실패했습니다.");
      return;
    }
    await refresh();
  };

  const deletePopup = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const fd = new FormData();
    fd.append("id", id);
    const res = await fetch("/api/admin/popups/delete", { method: "POST", body: fd });
    if (!res.ok) {
      alert("삭제에 실패했습니다.");
      return;
    }
    await refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("imageUrl", formData.imageUrl);
    fd.append("linkUrl", formData.linkUrl);
    fd.append("position", formData.position);
    fd.append("startDate", fromDateOnly(formData.startDate));
    fd.append("endDate", fromDateOnly(formData.endDate));

    const url = editingId ? "/api/admin/popups/update" : "/api/admin/popups/create";
    if (editingId) fd.append("id", editingId);

    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      alert("저장에 실패했습니다.");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      imageUrl: "",
      linkUrl: "",
      startDate: "",
      endDate: "",
      position: "center",
    });
    await refresh();
  };

  const startEdit = (p: Popup) => {
    setEditingId(p.id);
    setShowForm(true);
    setFormData({
      title: p.title,
      imageUrl: p.imageUrl,
      linkUrl: p.linkUrl || "",
      startDate: toDateOnly(p.startAt),
      endDate: toDateOnly(p.endAt),
      position: p.position,
    });
  };

  const formTitle = useMemo(() => (editingId ? "팝업 수정" : "새 팝업 등록"), [editingId]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin"
              className="text-white/50 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                arrow_back
              </span>
            </Link>
            <h1 className="text-[28px] font-bold tracking-tight">팝업 관리</h1>
          </div>
          <p className="text-white/50">메인페이지에 표시할 팝업을 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            add
          </span>
          새 팝업 등록
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
          {error}
        </div>
      )}

      {/* 팝업 등록 폼 */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h2 className="text-[18px] font-semibold mb-6">{formTitle}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] text-white/50 mb-2">팝업 제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="팝업 제목을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">이미지 URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="/popups/example.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">클릭 시 이동 URL</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/store 또는 https://..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">표시 위치</label>
                <select
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      position: e.target.value as "center" | "bottom-right",
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="center">화면 중앙</option>
                  <option value="bottom-right">우측 하단</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">시작일</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] text-white/50 mb-2">종료일</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/70 font-medium hover:bg-white/[0.1] transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
              >
                등록하기
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 팝업 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-white/40">불러오는 중...</div>
        ) : popups.length > 0 ? (
          popups.map((popup) => (
            <div
              key={popup.id}
              className="flex items-center gap-6 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
            >
              {/* 썸네일 */}
              <div className="w-32 h-20 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={popup.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-[16px] font-semibold text-white truncate">
                    {popup.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      popup.isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {popup.isActive ? "활성화" : "비활성화"}
                  </span>
                </div>
                <p className="text-[13px] text-white/50 mb-2">{toDateOnly(popup.startAt) || "-"} ~ {toDateOnly(popup.endAt) || "-"}</p>
                <div className="flex items-center gap-4 text-[13px] text-white/40">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                      link
                    </span>
                    {popup.linkUrl || "링크 없음"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                      place
                    </span>
                    {popup.position === "center" ? "화면 중앙" : "우측 하단"}
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(popup.id, !popup.isActive)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    popup.isActive
                      ? "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  }`}
                >
                  {popup.isActive ? "비활성화" : "활성화"}
                </button>
                <button
                  onClick={() => startEdit(popup)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => deletePopup(popup.id)}
                  className="p-2 rounded-lg bg-white/[0.06] text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    delete
                  </span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <span className="material-symbols-outlined text-white/20" style={{ fontSize: "48px" }}>
              web_asset
            </span>
            <p className="mt-4 text-[16px] font-medium text-white/60">등록된 팝업이 없습니다</p>
            <p className="mt-1 text-[14px] text-white/40">새 팝업을 등록해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

