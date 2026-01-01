"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Teacher = {
  id: string;
  slug: string;
  name: string;
  subjectName: string;
  imageUrl: string | null;
  mainImageUrl: string | null;
  educationText: string | null;
  careerText: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  isActive: boolean;
  position: number;
  createdAt: string;
};

export default function TeachersAdminClient() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    subjectName: "",
    imageUrl: "",
    mainImageUrl: "",
    educationText: "",
    careerText: "",
    instagramUrl: "",
    youtubeUrl: "",
    position: "0",
    isActive: true,
  });

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teachers/list", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error("FETCH_FAILED");
      const list: Teacher[] = Array.isArray(json.teachers) ? json.teachers : [];
      setTeachers(list);
    } catch {
      setError("선생님 목록을 불러오지 못했습니다. (DB 마이그레이션이 아직 적용되지 않았을 수 있습니다.)");
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEdit = (t: Teacher) => {
    setEditingId(t.id);
    setShowForm(true);
    setFormData({
      slug: t.slug,
      name: t.name,
      subjectName: t.subjectName,
      imageUrl: t.imageUrl || "",
      mainImageUrl: t.mainImageUrl || "",
      educationText: t.educationText || "",
      careerText: t.careerText || "",
      instagramUrl: t.instagramUrl || "",
      youtubeUrl: t.youtubeUrl || "",
      position: String(t.position ?? 0),
      isActive: Boolean(t.isActive),
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      slug: "",
      name: "",
      subjectName: "",
      imageUrl: "",
      mainImageUrl: "",
      educationText: "",
      careerText: "",
      instagramUrl: "",
      youtubeUrl: "",
      position: "0",
      isActive: true,
    });
  };

  const toggleActive = async (id: string, next: boolean) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    const fd = new FormData();
    fd.append("id", id);
    fd.append("slug", t.slug);
    fd.append("name", t.name);
    fd.append("subjectName", t.subjectName);
    fd.append("imageUrl", t.imageUrl || "");
    fd.append("mainImageUrl", t.mainImageUrl || "");
    fd.append("educationText", t.educationText || "");
    fd.append("careerText", t.careerText || "");
    fd.append("instagramUrl", t.instagramUrl || "");
    fd.append("youtubeUrl", t.youtubeUrl || "");
    fd.append("position", String(t.position ?? 0));
    fd.append("isActive", next ? "1" : "0");
    const res = await fetch("/api/admin/teachers/update", { method: "POST", body: fd });
    if (!res.ok) {
      alert("변경에 실패했습니다.");
      return;
    }
    await refresh();
  };

  const deleteTeacher = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const fd = new FormData();
    fd.append("id", id);
    const res = await fetch("/api/admin/teachers/delete", { method: "POST", body: fd });
    if (!res.ok) {
      alert("삭제에 실패했습니다.");
      return;
    }
    await refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("slug", formData.slug.trim());
    fd.append("name", formData.name.trim());
    fd.append("subjectName", formData.subjectName.trim());
    fd.append("imageUrl", formData.imageUrl.trim());
    fd.append("mainImageUrl", formData.mainImageUrl.trim());
    fd.append("educationText", formData.educationText);
    fd.append("careerText", formData.careerText);
    fd.append("instagramUrl", formData.instagramUrl.trim());
    fd.append("youtubeUrl", formData.youtubeUrl.trim());
    fd.append("position", formData.position);
    fd.append("isActive", formData.isActive ? "1" : "0");

    const url = editingId ? "/api/admin/teachers/update" : "/api/admin/teachers/create";
    if (editingId) fd.append("id", editingId);

    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      alert("저장에 실패했습니다. (slug는 영문/숫자/하이픈만 가능)");
      return;
    }

    resetForm();
    await refresh();
  };

  const formTitle = useMemo(() => (editingId ? "선생님 수정" : "새 선생님 등록"), [editingId]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin" className="text-white/50 hover:text-white transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                arrow_back
              </span>
            </Link>
            <h1 className="text-[28px] font-bold tracking-tight">선생님 관리</h1>
          </div>
          <p className="text-white/50">Teachers 페이지에 노출할 선생님 목록을 관리합니다.</p>
        </div>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            add
          </span>
          새 선생님 등록
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
          {error}
        </div>
      )}

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h2 className="text-[18px] font-semibold mb-6">{formTitle}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] text-white/50 mb-2">페이지 주소(slug)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="예: lee-sangyeob"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="mt-2 text-[12px] text-white/40">영문 소문자/숫자/하이픈만 허용됩니다.</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">Teachers 목록 이미지 URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://storage.googleapis.com/..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">Teachers 목록/헤더 등에서 사용되는 대표 이미지입니다.</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">선생님 메인 이미지 URL (개인 페이지 중앙)</label>
                <input
                  type="text"
                  value={formData.mainImageUrl}
                  onChange={(e) => setFormData({ ...formData, mainImageUrl: e.target.value })}
                  placeholder="https://storage.googleapis.com/..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">선생님 개인 페이지 상단 중앙 프로필 이미지로 노출됩니다.</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">커리큘럼 유튜브 URL</label>
                <input
                  type="text"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">선생님 페이지 우측 패널에 임베드됩니다 (단일 URL).</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">인스타그램 URL</label>
                <input
                  type="text"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">선생님 페이지 상단 아이콘에서 해당 URL로 이동합니다.</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">학력 (선생님 페이지 학력/약력 모달)</label>
                <textarea
                  value={formData.educationText}
                  onChange={(e) => setFormData({ ...formData, educationText: e.target.value })}
                  placeholder={"예)\\n서울대학교 국어교육과 졸업\\n(전) ○○고등학교 교사"}
                  className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">줄바꿈이 그대로 표시됩니다.</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">약력 (줄바꿈 = 항목)</label>
                <textarea
                  value={formData.careerText}
                  onChange={(e) => setFormData({ ...formData, careerText: e.target.value })}
                  placeholder={"예)\\n현) 유노바 국어 강사\\n전) ○○학원 대표강사"}
                  className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">줄바꿈 단위로 리스트로 표시됩니다.</p>
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">선생님 성함</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 이상엽"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">과목</label>
                <input
                  type="text"
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  placeholder="예: 국어"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] text-white/50 mb-2">정렬(position)</label>
                <input
                  type="number"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  min={0}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[12px] text-white/40">오름차순으로 정렬됩니다. (0은 미설정)</p>
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-[14px] text-white/70 select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="accent-blue-500"
                  />
                  Teachers 페이지에 노출
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
              >
                저장
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.1] transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-semibold">선생님 목록</h2>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.1] transition-colors text-[13px]"
          >
            새로고침
          </button>
        </div>

        {isLoading ? (
          <div className="text-white/50 text-sm">불러오는 중...</div>
        ) : teachers.length === 0 ? (
          <div className="text-white/50 text-sm">등록된 선생님이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                  {t.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/40 text-[12px]">NO IMG</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">
                      {t.name} <span className="text-white/40 font-normal">({t.subjectName})</span>
                    </p>
                    <span className="text-[12px] text-white/30">/{t.slug}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-white/40">
                    position: {t.position ?? 0} · created: {t.createdAt.slice(0, 10)}
                  </p>
                  {t.mainImageUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">메인 이미지: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">메인 이미지: 없음</p>
                  )}
                  {t.promoImageUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">광고 배너: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">광고 배너: 없음</p>
                  )}
                  {t.youtubeUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">유튜브: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">유튜브: 없음</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(t.id, !t.isActive)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                      t.isActive
                        ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                        : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"
                    }`}
                    title="노출 토글"
                  >
                    {t.isActive ? "노출중" : "숨김"}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.1] transition-colors text-[12px]"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteTeacher(t.id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 transition-colors text-[12px]"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


