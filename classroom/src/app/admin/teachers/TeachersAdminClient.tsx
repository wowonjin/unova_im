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
  promoImageUrl: string | null;
  selectedCourseIds?: string[];
  selectedTextbookIds?: string[];
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
  const teacherTabs = [
    { key: "basic", label: "기본" },
    { key: "images", label: "이미지" },
    { key: "promo", label: "상세이미지" },
    { key: "products", label: "강좌/교재" },
    { key: "links", label: "링크" },
    { key: "career", label: "학력/약력" },
    { key: "design", label: "디자인" },
  ] as const;
  type TeacherTabKey = (typeof teacherTabs)[number]["key"];
  const [activeTab, setActiveTab] = useState<TeacherTabKey>("basic");
  const [productTab, setProductTab] = useState<"courses" | "textbooks">("courses");
  const [courseOptions, setCourseOptions] = useState<Array<{ id: string; title: string; teacherName?: string | null; subjectName?: string | null }>>([]);
  const [textbookOptions, setTextbookOptions] = useState<Array<{ id: string; title: string; teacherName?: string | null; subjectName?: string | null }>>([]);
  const [productSearch, setProductSearch] = useState("");
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    subjectName: "",
    headerSubText: "",
    imageUrl: "",
    mainImageUrl: "",
    promoImageUrl: "",
    selectedCourseIds: [] as string[],
    selectedTextbookIds: [] as string[],
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
    setActiveTab("basic");
    setFormData({
      slug: t.slug,
      name: t.name,
      subjectName: t.subjectName,
      headerSubText: t.headerSubText || "",
      imageUrl: t.imageUrl || "",
      mainImageUrl: t.mainImageUrl || "",
      promoImageUrl: t.promoImageUrl || "",
      selectedCourseIds: Array.isArray(t.selectedCourseIds) ? t.selectedCourseIds : [],
      selectedTextbookIds: Array.isArray(t.selectedTextbookIds) ? t.selectedTextbookIds : [],
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
    setActiveTab("basic");
    setFormData({
      slug: "",
      name: "",
      subjectName: "",
      headerSubText: "",
      imageUrl: "",
      mainImageUrl: "",
      promoImageUrl: "",
      selectedCourseIds: [],
      selectedTextbookIds: [],
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
    fd.append("promoImageUrl", t.promoImageUrl || "");
    fd.append("selectedCourseIds", JSON.stringify(Array.isArray(t.selectedCourseIds) ? t.selectedCourseIds : []));
    fd.append("selectedTextbookIds", JSON.stringify(Array.isArray(t.selectedTextbookIds) ? t.selectedTextbookIds : []));
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
    // 탭 UI로 인해 필수 필드가 화면에 보이지 않아도 제출될 수 있으므로, 최소 필수값은 직접 검증
    if (!formData.slug.trim() || !formData.name.trim() || !formData.subjectName.trim()) {
      setActiveTab("basic");
      alert("페이지 주소(slug), 선생님 성함, 과목은 필수 입력입니다.");
      return;
    }

    const fd = new FormData();
    fd.append("slug", formData.slug.trim());
    fd.append("name", formData.name.trim());
    fd.append("subjectName", formData.subjectName.trim());
    fd.append("headerSubText", formData.headerSubText.trim());
    fd.append("imageUrl", formData.imageUrl.trim());
    fd.append("mainImageUrl", formData.mainImageUrl.trim());
    fd.append("promoImageUrl", formData.promoImageUrl.trim());
    fd.append("selectedCourseIds", JSON.stringify(formData.selectedCourseIds));
    fd.append("selectedTextbookIds", JSON.stringify(formData.selectedTextbookIds));
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

  // 강좌/교재 옵션 로드 (1회)
  useEffect(() => {
    if (!showForm) return;
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          // 강좌/교재 선택 옵션은 "판매하기" 기준으로만 노출
          fetch("/api/admin/courses/list?scope=teacher-picker", { cache: "no-store" }),
          fetch("/api/admin/textbooks/list?scope=teacher-picker", { cache: "no-store" }),
        ]);
        const cJson = await cRes.json().catch(() => null);
        const tJson = await tRes.json().catch(() => null);
        if (cRes.ok && cJson?.ok && Array.isArray(cJson.courses)) {
          setCourseOptions(
            cJson.courses.map((c: any) => ({
              id: String(c.id),
              title: String(c.title ?? "강좌"),
              teacherName: typeof c.teacherName === "string" ? c.teacherName : null,
              subjectName: typeof c.subjectName === "string" ? c.subjectName : null,
            }))
          );
        }
        if (tRes.ok && tJson?.ok && Array.isArray(tJson.textbooks)) {
          setTextbookOptions(
            tJson.textbooks.map((t: any) => ({
              id: String(t.id),
              title: String(t.title ?? "교재"),
              teacherName: typeof t.teacherName === "string" ? t.teacherName : null,
              subjectName: typeof t.subjectName === "string" ? t.subjectName : null,
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
  }, [showForm]);

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
            else {
              setShowForm(true);
              setActiveTab("basic");
            }
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

          {/* 탭 메뉴 */}
          <div className="mb-6 -mx-2 px-2">
            <div className="flex gap-4 overflow-x-auto border-b border-white/10 pb-2 scrollbar-hide" role="tablist" aria-label="선생님 설정 탭">
              {teacherTabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    role="tab"
                    aria-selected={isActive}
                    className={`relative shrink-0 px-1 py-2 text-[13px] font-semibold transition-colors ${
                      isActive ? "text-white" : "text-white/55 hover:text-white/75"
                    }`}
                  >
                    {t.label}
                    {isActive ? (
                      <span className="absolute left-0 right-0 -bottom-2 h-[2px] rounded-full bg-white" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className={`${activeTab === "basic" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
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
            <div className={`${activeTab === "images" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
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

            {/* 상세페이지 이미지 */}
            <div className={`${activeTab === "promo" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
              <h3 className="text-[15px] font-semibold mb-4">상세페이지 이미지</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">상세페이지 이미지 URL</label>
                  <input
                    type="text"
                    value={formData.promoImageUrl}
                    onChange={(e) => setFormData({ ...formData, promoImageUrl: e.target.value })}
                    placeholder="https://storage.googleapis.com/..."
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[12px] text-white/40">
                    모바일: 선생님 페이지 <span className="text-white/60">커리큘럼</span> 탭에 노출 · PC: 선생님 페이지 하단에 노출
                  </p>
                </div>
              </div>
            </div>

            {/* 강좌/교재 선택 */}
            <div className={`${activeTab === "products" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
              <h3 className="text-[15px] font-semibold mb-4">강좌 / 교재 선택</h3>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setProductTab("courses")}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition ${
                    productTab === "courses"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06]"
                  }`}
                >
                  강좌
                </button>
                <button
                  type="button"
                  onClick={() => setProductTab("textbooks")}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition ${
                    productTab === "textbooks"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06]"
                  }`}
                >
                  교재
                </button>
                <div className="ml-auto text-[12px] text-white/45">
                  선택됨:{" "}
                  {productTab === "courses" ? formData.selectedCourseIds.length : formData.selectedTextbookIds.length}개
                </div>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="검색: 제목/선생님/과목"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
              </div>

              {productTab === "courses" ? (
                <div className="space-y-2">
                  {courseOptions
                    .filter((c) => {
                      const q = productSearch.trim().toLowerCase();
                      if (!q) return true;
                      const hay = `${c.title} ${c.teacherName ?? ""} ${c.subjectName ?? ""}`.toLowerCase();
                      return hay.includes(q);
                    })
                    .map((c) => {
                      const checked = formData.selectedCourseIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              selectedCourseIds: checked
                                ? prev.selectedCourseIds.filter((x) => x !== c.id)
                                : [...prev.selectedCourseIds, c.id],
                            }));
                          }}
                          className={`w-full flex items-center gap-3 text-left p-3 rounded-xl border transition ${
                            checked
                              ? "bg-blue-500/10 border-blue-400/30"
                              : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]"
                          }`}
                        >
                          <input type="checkbox" checked={checked} readOnly className="accent-blue-500" />
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-white/90">{c.title}</div>
                            <div className="text-[12px] text-white/45">
                              {c.teacherName ? `${c.teacherName}` : "선생님 미지정"}
                              {c.subjectName ? ` · ${c.subjectName}` : ""}
                            </div>
                          </div>
                          <span className={`text-[12px] font-semibold ${checked ? "text-blue-300" : "text-white/45"}`}>
                            {checked ? "선택됨" : "선택"}
                          </span>
                        </button>
                      );
                    })}
                  {courseOptions.length === 0 ? (
                    <div className="py-10 text-center text-white/45 text-[13px]">게시된 강좌가 없습니다.</div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {textbookOptions
                    .filter((t) => {
                      const q = productSearch.trim().toLowerCase();
                      if (!q) return true;
                      const hay = `${t.title} ${t.teacherName ?? ""} ${t.subjectName ?? ""}`.toLowerCase();
                      return hay.includes(q);
                    })
                    .map((t) => {
                      const checked = formData.selectedTextbookIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              selectedTextbookIds: checked
                                ? prev.selectedTextbookIds.filter((x) => x !== t.id)
                                : [...prev.selectedTextbookIds, t.id],
                            }));
                          }}
                          className={`w-full flex items-center gap-3 text-left p-3 rounded-xl border transition ${
                            checked
                              ? "bg-purple-500/10 border-purple-400/30"
                              : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]"
                          }`}
                        >
                          <input type="checkbox" checked={checked} readOnly className="accent-purple-500" />
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-white/90">{t.title}</div>
                            <div className="text-[12px] text-white/45">
                              {t.teacherName ? `${t.teacherName}` : "선생님 미지정"}
                              {t.subjectName ? ` · ${t.subjectName}` : ""}
                            </div>
                          </div>
                          <span className={`text-[12px] font-semibold ${checked ? "text-purple-300" : "text-white/45"}`}>
                            {checked ? "선택됨" : "선택"}
                          </span>
                        </button>
                      );
                    })}
                  {textbookOptions.length === 0 ? (
                    <div className="py-10 text-center text-white/45 text-[13px]">게시된 교재가 없습니다.</div>
                  ) : null}
                </div>
              )}

              <p className="mt-4 text-[12px] text-white/40">
                선생님 페이지의 <span className="text-white/60">강좌 및 교재</span> 탭(모바일) / 강좌·교재 섹션(PC)에 이 선택값이 그대로 반영됩니다.
              </p>
            </div>

            {/* SNS/유튜브 */}
            <div className={`${activeTab === "links" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
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
            <div className={`${activeTab === "career" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
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
            <div className={`${activeTab === "design" ? "" : "hidden"} rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5`}>
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


