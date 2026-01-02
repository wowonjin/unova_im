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
  headerSubText: string | null;
  pageBgColor: string | null;
  menuBgColor: string | null;
  newsBgColor: string | null;
  ratingBgColor: string | null;
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
    headerSubText: "",
    imageUrl: "",
    mainImageUrl: "",
    pageBgColor: "",
    menuBgColor: "",
    newsBgColor: "",
    ratingBgColor: "",
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
      headerSubText: t.headerSubText || "",
      imageUrl: t.imageUrl || "",
      mainImageUrl: t.mainImageUrl || "",
      pageBgColor: t.pageBgColor || "",
      menuBgColor: t.menuBgColor || "",
      newsBgColor: t.newsBgColor || "",
      ratingBgColor: t.ratingBgColor || "",
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
      headerSubText: "",
      imageUrl: "",
      mainImageUrl: "",
      pageBgColor: "",
      menuBgColor: "",
      newsBgColor: "",
      ratingBgColor: "",
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
    fd.append("headerSubText", t.headerSubText || "");
    fd.append("imageUrl", t.imageUrl || "");
    fd.append("mainImageUrl", t.mainImageUrl || "");
    fd.append("pageBgColor", t.pageBgColor || "");
    fd.append("menuBgColor", t.menuBgColor || "");
    fd.append("newsBgColor", t.newsBgColor || "");
    fd.append("ratingBgColor", t.ratingBgColor || "");
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
    fd.append("headerSubText", formData.headerSubText.trim());
    fd.append("imageUrl", formData.imageUrl.trim());
    fd.append("mainImageUrl", formData.mainImageUrl.trim());
    fd.append("pageBgColor", formData.pageBgColor.trim());
    fd.append("menuBgColor", formData.menuBgColor.trim());
    fd.append("newsBgColor", formData.newsBgColor.trim());
    fd.append("ratingBgColor", formData.ratingBgColor.trim());
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
  const teacherSlug = formData.slug.trim();

  const isHexColor = (v: string) => /^#([0-9a-fA-F]{6})$/.test((v || "").trim());
  const toHexOrFallback = (v: string, fallback: string) => (isHexColor(v) ? v.trim() : fallback);

  const ColorField = ({
    label,
    value,
    placeholder,
    onChange,
    fallback,
  }: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (next: string) => void;
    fallback: string;
  }) => {
    const colorValue = toHexOrFallback(value, fallback);
    return (
      <div>
        <label className="block text-[12px] text-white/40 mb-2">{label}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-[44px] w-[44px] rounded-xl border border-white/[0.12] bg-white/[0.04] p-1"
            aria-label={label}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
          />
        </div>
        <p className="mt-2 text-[12px] text-white/40">권장: <span className="text-white/60">#RRGGBB</span></p>
      </div>
    );
  };

  return (
    <div className="w-full">
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
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="text-[18px] font-semibold">{formTitle}</h2>
            {teacherSlug ? (
              <div className="flex items-center gap-2">
                <a
                  href={`/teachers/${encodeURIComponent(teacherSlug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.1] transition-colors text-[13px]"
                >
                  페이지 미리보기
                </a>
                <a
                  href={`/teachers/${encodeURIComponent(teacherSlug)}?customize=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.1] transition-colors text-[13px]"
                >
                  디자인 수정(라이브)
                </a>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold">기본 정보</h3>
                <label className="inline-flex items-center gap-2 text-[13px] text-white/70 select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="accent-blue-500"
                  />
                  Teachers 페이지에 노출
                </label>
              </div>
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

                <div className="md:col-span-2">
                  <label className="block text-[13px] text-white/50 mb-2">몸통 문장 (상단 문구)</label>
                  <input
                    type="text"
                    value={formData.headerSubText}
                    onChange={(e) => setFormData({ ...formData, headerSubText: e.target.value })}
                    placeholder="예: 문장 구조를 읽는 알고리즘 독해"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[12px] text-white/40">비워두면 선생님 페이지에서 문장이 아예 표시되지 않습니다.</p>
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
              </div>
            </div>

            {/* 이미지 */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <h3 className="text-[15px] font-semibold mb-4">이미지</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>

            {/* SNS/유튜브 */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <h3 className="text-[15px] font-semibold mb-4">링크</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>

            {/* 학력/약력 */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <h3 className="text-[15px] font-semibold mb-4">학력 / 약력</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">학력 (모달)</label>
                  <textarea
                    value={formData.educationText}
                    onChange={(e) => setFormData({ ...formData, educationText: e.target.value })}
                    placeholder={"예)\\n서울대학교 국어교육과 졸업\\n(전) ○○고등학교 교사"}
                    className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[12px] text-white/40">줄바꿈이 그대로 표시됩니다.</p>
                </div>
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">약력 (줄바꿈 = 항목)</label>
                  <textarea
                    value={formData.careerText}
                    onChange={(e) => setFormData({ ...formData, careerText: e.target.value })}
                    placeholder={"예)\\n현) 유노바 국어 강사\\n전) ○○학원 대표강사"}
                    className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[12px] text-white/40">줄바꿈 단위로 리스트로 표시됩니다.</p>
                </div>
              </div>
            </div>

            {/* 디자인(색상) */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <h3 className="text-[15px] font-semibold mb-4">디자인(색상)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorField
                  label="뒤 배경색 (pageBgColor)"
                  value={formData.pageBgColor}
                  onChange={(next) => setFormData({ ...formData, pageBgColor: next })}
                  placeholder="예: #464065"
                  fallback="#464065"
                />
                <ColorField
                  label="좌측 메뉴 배경색 (menuBgColor)"
                  value={formData.menuBgColor}
                  onChange={(next) => setFormData({ ...formData, menuBgColor: next })}
                  placeholder="예: #2f232b"
                  fallback="#2f232b"
                />
                <ColorField
                  label="최근 소식 배경색 (newsBgColor)"
                  value={formData.newsBgColor}
                  onChange={(next) => setFormData({ ...formData, newsBgColor: next })}
                  placeholder="예: #2A263D"
                  fallback="#2A263D"
                />
                <ColorField
                  label="총 강의 평점 배경색 (ratingBgColor)"
                  value={formData.ratingBgColor}
                  onChange={(next) => setFormData({ ...formData, ratingBgColor: next })}
                  placeholder="예: #2A263D"
                  fallback="#2A263D"
                />
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-[12px] text-white/60 mb-2">간단 미리보기</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-white/70">페이지</span>
                  <span className="h-5 w-5 rounded border border-white/20" style={{ background: toHexOrFallback(formData.pageBgColor, "#464065") }} />
                  <span className="text-[12px] text-white/70 ml-2">메뉴</span>
                  <span className="h-5 w-5 rounded border border-white/20" style={{ background: toHexOrFallback(formData.menuBgColor, "#2f232b") }} />
                  <span className="text-[12px] text-white/70 ml-2">최근소식</span>
                  <span className="h-5 w-5 rounded border border-white/20" style={{ background: toHexOrFallback(formData.newsBgColor, "#2A263D") }} />
                  <span className="text-[12px] text-white/70 ml-2">평점</span>
                  <span className="h-5 w-5 rounded border border-white/20" style={{ background: toHexOrFallback(formData.ratingBgColor, "#2A263D") }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/40 text-[12px]">NO IMG</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {t.name} <span className="text-white/40 font-normal">({t.subjectName})</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-white/30 truncate">/{t.slug}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="mt-1 text-[12px] text-white/40">
                    position: {t.position ?? 0} · created: {t.createdAt.slice(0, 10)}
                  </p>
                  {t.mainImageUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">메인 이미지: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">메인 이미지: 없음</p>
                  )}
                  {t.youtubeUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">유튜브: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">유튜브: 없음</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
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


