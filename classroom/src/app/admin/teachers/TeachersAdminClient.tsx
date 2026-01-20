"use client";

import { useEffect, useMemo, useState } from "react";

type Teacher = {
  id: string;
  slug: string;
  name: string;
  subjectName: string;
  subjectTextColor: string | null;
  imageUrl: string | null;
  mainImageUrl: string | null;
  universityIconUrl?: string | null;
  promoImageUrl: string | null;
  selectedCourseIds?: string[];
  selectedTextbookIds?: string[];
  accountUserId?: string | null;
  accountEmail?: string | null;
  headerSubText: string | null;
  pageBgColor: string | null;
  newsBgColor: string | null;
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const teacherTabs = [
    { key: "basic", label: "기본" },
    { key: "subjectColor", label: "과목색" },
    { key: "career", label: "학력/약력" },
    { key: "account", label: "계정" },
    { key: "design", label: "디자인" },
  ] as const;
  type TeacherTabKey = (typeof teacherTabs)[number]["key"];
  const [activeTab, setActiveTab] = useState<TeacherTabKey>("basic");
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);
  const [isRestoringOwnership, setIsRestoringOwnership] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ courses: number; textbooks: number } | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    subjectName: "",
    subjectTextColor: "",
    headerSubText: "",
    imageUrl: "",
    mainImageUrl: "",
    universityIconUrl: "",
    pageBgColor: "",
    newsBgColor: "",
    educationText: "",
    careerText: "",
    instagramUrl: "",
    youtubeUrl: "",
    isActive: true,
  });

  const moveTeacher = (list: Teacher[], fromId: string, toId: string) => {
    const fromIdx = list.findIndex((t) => t.id === fromId);
    const toIdx = list.findIndex((t) => t.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return list;
    const next = list.slice();
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
  };

  const persistTeacherOrder = async (nextList: Teacher[]) => {
    const teacherIds = nextList.map((t) => t.id);
    const res = await fetch("/api/admin/teachers/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherIds }),
    });
    if (!res.ok) throw new Error("REORDER_FAILED");
  };

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
    setAccountEmailInput(t.accountEmail || "");
    setIssuedPassword(null);
    setRestoreResult(null);
    setFormData({
      slug: t.slug,
      name: t.name,
      subjectName: t.subjectName,
      subjectTextColor: t.subjectTextColor || "",
      headerSubText: t.headerSubText || "",
      imageUrl: t.imageUrl || "",
      mainImageUrl: t.mainImageUrl || "",
      universityIconUrl: (t as any).universityIconUrl || "",
      pageBgColor: t.pageBgColor || "",
      newsBgColor: t.newsBgColor || "",
      educationText: t.educationText || "",
      careerText: t.careerText || "",
      instagramUrl: t.instagramUrl || "",
      youtubeUrl: t.youtubeUrl || "",
      isActive: Boolean(t.isActive),
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setActiveTab("basic");
    setAccountEmailInput("");
    setIssuedPassword(null);
    setRestoreResult(null);
    setFormData({
      slug: "",
      name: "",
      subjectName: "",
      subjectTextColor: "",
      headerSubText: "",
      imageUrl: "",
      mainImageUrl: "",
      universityIconUrl: "",
      pageBgColor: "",
      newsBgColor: "",
      educationText: "",
      careerText: "",
      instagramUrl: "",
      youtubeUrl: "",
      isActive: true,
    });
  };

  const editingTeacher = useMemo(() => teachers.find((t) => t.id === editingId) ?? null, [teachers, editingId]);

  const linkTeacherAccount = async () => {
    if (!editingId) {
      alert("먼저 선생님을 저장한 뒤, 계정을 연결해주세요.");
      return;
    }
    const email = accountEmailInput.trim().toLowerCase();
    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }
    setIsLinkingAccount(true);
    setIssuedPassword(null);
    setRestoreResult(null);
    try {
      const res = await fetch("/api/admin/teachers/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: editingId, email, generatePassword: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert("계정 연결에 실패했습니다.");
        return;
      }
      if (typeof json?.password === "string" && json.password.trim()) {
        setIssuedPassword(json.password.trim());
      } else {
        setIssuedPassword(null);
      }
      await refresh();
    } catch {
      alert("계정 연결 중 오류가 발생했습니다.");
    } finally {
      setIsLinkingAccount(false);
    }
  };

  const restoreAdminOwnership = async () => {
    if (!editingId) return;
    setIsRestoringOwnership(true);
    setRestoreResult(null);
    try {
      const res = await fetch("/api/admin/teachers/restore-admin-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: editingId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert("복구에 실패했습니다. (선생님 계정이 연결되어 있는지 확인해주세요.)");
        return;
      }
      const courses = Number(json?.updated?.courses ?? 0);
      const textbooks = Number(json?.updated?.textbooks ?? 0);
      setRestoreResult({ courses, textbooks });
      await refresh();
    } catch {
      alert("복구 중 오류가 발생했습니다.");
    } finally {
      setIsRestoringOwnership(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    const fd = new FormData();
    fd.append("id", id);
    fd.append("slug", t.slug);
    fd.append("name", t.name);
    fd.append("subjectName", t.subjectName);
    fd.append("subjectTextColor", t.subjectTextColor || "");
    fd.append("headerSubText", t.headerSubText || "");
    fd.append("imageUrl", t.imageUrl || "");
    fd.append("mainImageUrl", t.mainImageUrl || "");
    fd.append("universityIconUrl", (t as any).universityIconUrl || "");
    fd.append("pageBgColor", t.pageBgColor || "");
    fd.append("newsBgColor", t.newsBgColor || "");
    fd.append("educationText", t.educationText || "");
    fd.append("careerText", t.careerText || "");
    fd.append("instagramUrl", t.instagramUrl || "");
    fd.append("youtubeUrl", t.youtubeUrl || "");
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
    fd.append("subjectTextColor", formData.subjectTextColor.trim());
    fd.append("headerSubText", formData.headerSubText.trim());
    fd.append("imageUrl", formData.imageUrl.trim());
    fd.append("mainImageUrl", formData.mainImageUrl.trim());
    fd.append("universityIconUrl", formData.universityIconUrl.trim());
    fd.append("pageBgColor", formData.pageBgColor.trim());
    fd.append("newsBgColor", formData.newsBgColor.trim());
    fd.append("educationText", formData.educationText);
    fd.append("careerText", formData.careerText);
    fd.append("instagramUrl", formData.instagramUrl.trim());
    fd.append("youtubeUrl", formData.youtubeUrl.trim());
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
            className="h-[44px] w-[44px] rounded-xl border border-white/[0.12] bg-transparent p-1"
            aria-label={label}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
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
            <h1 className="text-[28px] font-bold tracking-tight">선생님 관리</h1>
          </div>
          <p className="text-white/50">Teachers 페이지에 노출할 선생님 목록을 관리합니다.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
          {error}
        </div>
      )}

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-transparent border border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="text-[18px] font-semibold">{formTitle}</h2>
            <button
              type="submit"
              form="teacher-admin-form"
              className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors text-[13px]"
            >
              저장
            </button>
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

          <form id="teacher-admin-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className={`${activeTab === "basic" ? "" : "hidden"} space-y-4`}>
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 왼쪽: 기본 정보 */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] text-white/50 mb-2">페이지 주소(slug)</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="예: lee-sangyeob"
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
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
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[13px] text-white/50 mb-2">과목</label>
                      <input
                        type="text"
                        value={formData.subjectName}
                        onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                        placeholder="예: 국어"
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
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
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      />
                      <p className="mt-2 text-[12px] text-white/40">비워두면 선생님 페이지에서 문장이 아예 표시되지 않습니다.</p>
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 이미지 -> 링크 */}
                <div className="lg:col-span-5 space-y-4">
                  {/* 이미지 */}
                  <div className="rounded-2xl border border-white/[0.06] bg-transparent p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-white/45" style={{ fontSize: "18px" }}>
                        image
                      </span>
                      <h4 className="text-[14px] font-semibold text-white/85">이미지</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[13px] text-white/50 mb-2">Teachers 목록 이미지 URL</label>
                        <input
                          type="text"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          placeholder="https://storage.googleapis.com/..."
                          className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
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
                          className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                        />
                        <p className="mt-2 text-[12px] text-white/40">선생님 개인 페이지 상단 중앙 프로필 이미지로 노출됩니다.</p>
                      </div>
                      <div>
                        <label className="block text-[13px] text-white/50 mb-2">대학교 아이콘 이미지 URL (말풍선 배지)</label>
                        <input
                          type="text"
                          value={formData.universityIconUrl}
                          onChange={(e) => setFormData({ ...formData, universityIconUrl: e.target.value })}
                          placeholder="https://storage.googleapis.com/..."
                          className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                        />
                        <p className="mt-2 text-[12px] text-white/40">선생님 이미지 위에 작게 말풍선 형태로 오버레이됩니다. 비워두면 표시하지 않습니다.</p>
                      </div>
                    </div>
                  </div>

                  {/* 링크 */}
                  <div className="rounded-2xl border border-white/[0.06] bg-transparent p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-white/45" style={{ fontSize: "18px" }}>
                        link
                      </span>
                      <h4 className="text-[14px] font-semibold text-white/85">링크</h4>
                    </div>

                    <div>
                      <label className="block text-[13px] text-white/50 mb-2">커리큘럼 유튜브 URL</label>
                      <input
                        type="text"
                        value={formData.youtubeUrl}
                        onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
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
                        className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                      />
                      <p className="mt-2 text-[12px] text-white/40">선생님 페이지 상단 아이콘에서 해당 URL로 이동합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 학력/약력 */}
            <div className={`${activeTab === "career" ? "" : "hidden"} space-y-4`}>
              <h3 className="text-[15px] font-semibold mb-4">학력 / 약력</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">학력 (모달)</label>
                  <textarea
                    value={formData.educationText}
                    onChange={(e) => setFormData({ ...formData, educationText: e.target.value })}
                    placeholder={"예)\\n서울대학교 국어교육과 졸업\\n(전) ○○고등학교 교사"}
                    className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[12px] text-white/40">줄바꿈이 그대로 표시됩니다.</p>
                </div>
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">약력 (줄바꿈 = 항목)</label>
                  <textarea
                    value={formData.careerText}
                    onChange={(e) => setFormData({ ...formData, careerText: e.target.value })}
                    placeholder={"예)\\n현) 유노바 국어 강사\\n전) ○○학원 대표강사"}
                    className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[12px] text-white/40">줄바꿈 단위로 리스트로 표시됩니다.</p>
                </div>
              </div>
            </div>

            {/* 계정 연결 */}
            <div className={`${activeTab === "account" ? "" : "hidden"} space-y-4`}>
              <h3 className="text-[15px] font-semibold mb-2">선생님 계정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-white/50 mb-2">계정 이메일</label>
                  <input
                    type="email"
                    value={accountEmailInput}
                    onChange={(e) => setAccountEmailInput(e.target.value)}
                    placeholder="teacher@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={linkTeacherAccount}
                    disabled={isLinkingAccount || !editingId}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-60"
                  >
                    {isLinkingAccount ? (
                      <>
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: "18px" }}>progress_activity</span>
                        설정 중...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>key</span>
                        비밀번호를 unovaadmin으로 설정
                      </>
                    )}
                  </button>
                </div>
              </div>

              {issuedPassword ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <p className="text-[13px] font-semibold text-emerald-100">비밀번호</p>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <code className="rounded-xl bg-black/30 px-3 py-2 text-[13px] text-emerald-100">
                      {issuedPassword}
                    </code>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(issuedPassword);
                          alert("복사했습니다.");
                        } catch {
                          alert("복사에 실패했습니다.");
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/25 text-[13px] font-semibold"
                    >
                      복사
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/[0.06] bg-transparent p-5">
                <p className="text-[13px] font-semibold text-white/80">상품 소유권 복구(관리자)</p>
                <p className="mt-1 text-[12px] text-white/45">
                  운영 정책: 상품은 <span className="text-white/70 font-semibold">관리자 소유(ownerId)</span>로 유지하고, 선생님 콘솔은 데이터(주문/정산)만 연동합니다.
                  이전에 실수로 소유권이 선생님 계정으로 이동된 경우, 여기서 관리자 소유로 되돌릴 수 있습니다.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={restoreAdminOwnership}
                    disabled={isRestoringOwnership || !editingId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-white/[0.12] disabled:opacity-60"
                  >
                    {isRestoringOwnership ? (
                      <>
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: "18px" }}>progress_activity</span>
                        복구 중...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>settings_backup_restore</span>
                        관리자 소유로 복구
                      </>
                    )}
                  </button>
                  {restoreResult ? (
                    <p className="text-[12px] text-emerald-200/80">
                      완료: 강좌 {restoreResult.courses}개, 교재 {restoreResult.textbooks}개 복구
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 디자인(색상) */}
            <div className={`${activeTab === "design" ? "" : "hidden"} space-y-4`}>
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
                  label="최근 소식 배경색 (newsBgColor)"
                  value={formData.newsBgColor}
                  onChange={(next) => setFormData({ ...formData, newsBgColor: next })}
                  placeholder="예: #2A263D"
                  fallback="#2A263D"
                />
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-transparent p-4">
                <div className="text-[12px] text-white/60 mb-2">간단 미리보기</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-white/70">페이지</span>
                  <span className="h-5 w-5 rounded border border-white/20" style={{ background: toHexOrFallback(formData.pageBgColor, "#464065") }} />
                  <span className="text-[12px] text-white/70 ml-2">최근소식</span>
                  <span className="h-5 w-5 rounded border border-white/20" style={{ background: toHexOrFallback(formData.newsBgColor, "#2A263D") }} />
                </div>
              </div>
            </div>

            {/* 과목명 색상 */}
            <div className={`${activeTab === "subjectColor" ? "" : "hidden"} space-y-4`}>
              <h3 className="text-[15px] font-semibold mb-4">과목색</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorField
                  label="과목명 색상 (subjectTextColor)"
                  value={formData.subjectTextColor}
                  onChange={(next) => setFormData({ ...formData, subjectTextColor: next })}
                  placeholder="예: #957FF3"
                  fallback="#957FF3"
                />
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-transparent p-4">
                <div className="text-[12px] text-white/60 mb-2">미리보기</div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-white/70">과목명</span>
                  <span className="text-[14px] font-semibold" style={{ color: toHexOrFallback(formData.subjectTextColor, "#957FF3") }}>
                    {formData.subjectName || "과목"}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      <div className="p-6 rounded-2xl bg-transparent border border-white/[0.06]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-semibold">선생님 목록</h2>
          <button
            type="button"
            onClick={() => {
              if (showForm) resetForm();
              else {
                setShowForm(true);
                setActiveTab("basic");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-black hover:bg-white/90 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              add
            </span>
            새 선생님 등록
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
                draggable
                onDragStart={() => setDraggingId(t.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                onDragOver={(e) => {
                  if (!draggingId) return;
                  e.preventDefault();
                  setDragOverId(t.id);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (!draggingId) return;
                  const fromId = draggingId;
                  const toId = t.id;
                  const prev = teachers;
                  const nextList = moveTeacher(prev, fromId, toId);
                  setTeachers(nextList);
                  setDraggingId(null);
                  setDragOverId(null);
                  try {
                    await persistTeacherOrder(nextList);
                    await refresh();
                  } catch {
                    alert("순서 저장에 실패했습니다.");
                    setTeachers(prev);
                  }
                }}
                className="flex flex-col gap-3 p-4 rounded-2xl bg-transparent border border-white/[0.06]"
                style={{
                  opacity: draggingId === t.id ? 0.6 : 1,
                  outline: dragOverId === t.id && draggingId !== t.id ? "2px solid rgba(255,255,255,0.35)" : "none",
                  outlineOffset: "2px",
                  cursor: "grab",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-transparent border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
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
                  <span
                    className="material-symbols-outlined text-white/35"
                    style={{ fontSize: "18px" }}
                    title="드래그해서 순서 변경"
                  >
                    drag_indicator
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="mt-1 text-[12px] text-white/40">
                    created: {t.createdAt.slice(0, 10)}
                  </p>
                  {t.mainImageUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">메인 이미지: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">메인 이미지: 없음</p>
                  )}
                  {(t as any).universityIconUrl ? (
                    <p className="mt-1 text-[12px] text-emerald-200/80">대학교 아이콘: 설정됨</p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/30">대학교 아이콘: 없음</p>
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


