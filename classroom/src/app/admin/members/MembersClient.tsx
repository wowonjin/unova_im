"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Member = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  imwebMemberCode: string | null;
  address: string | null;
  addressDetail: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  enrollmentCount: number;
  textbookCount: number;
  totalPayment: number;
};

type Props = {
  members: Member[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query: string;
};

// 인라인 편집 컴포넌트
function EditableField({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (inputValue === (value || "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(inputValue);
      setEditing(false);
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setInputValue(value || "");
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        autoFocus
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex w-full items-center gap-1 text-left text-sm text-white/70 hover:text-white"
    >
      <span className={value ? "" : "italic text-white/40"}>{value || placeholder}</span>
      <span className="material-symbols-outlined opacity-0 transition-opacity group-hover:opacity-100" style={{ fontSize: "14px" }}>
        edit
      </span>
    </button>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

function initials(nameOrEmail: string) {
  const s = nameOrEmail.trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? s[0];
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export default function MembersClient({
  members: initialMembers,
  totalCount,
  currentPage,
  totalPages,
  query,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [searchValue, setSearchValue] = useState(query);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 회원 정보 업데이트
  const updateMember = async (memberId: string, field: string, value: string) => {
    const res = await fetch("/api/admin/members/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, field, value }),
    });
    if (!res.ok) throw new Error("Update failed");
    
    // 로컬 상태 업데이트
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, [field]: value || null } : m))
    );
  };

  // 회원 삭제
  const deleteMember = async (memberId: string) => {
    if (!confirm("정말 이 회원을 삭제하시겠습니까?\n\n관련된 수강 정보, 교재 권한 등이 모두 삭제됩니다.")) {
      return;
    }
    
    setDeletingId(memberId);
    try {
      const res = await fetch("/api/admin/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      router.refresh();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("q", searchValue.trim());
    router.push(`/admin/members?${params.toString()}`);
  };

  const handleExport = async () => {
    window.location.href = "/api/admin/members/export";
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/members/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ success: data.success, failed: data.failed });
        router.refresh();
      } else {
        alert(data.error || "가져오기 실패");
      }
    } catch {
      alert("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">모든 회원</h1>
          <p className="mt-1 text-sm text-white/60">
            총 {totalCount.toLocaleString()}명의 회원이 등록되어 있습니다
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 엑셀 내보내기 */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            내보내기
          </button>

          {/* 엑셀 가져오기 */}
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {importing ? "가져오는 중..." : "가져오기"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* 가져오기 결과 */}
      {importResult && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
          <span className="text-emerald-400">
            ✓ {importResult.success}명 가져오기 완료
          </span>
          {importResult.failed > 0 && (
            <span className="ml-2 text-white/60">
              ({importResult.failed}명 실패)
            </span>
          )}
        </div>
      )}

      {/* 검색 */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="이메일, 이름, 전화번호로 검색..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
        <svg
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </form>

      {/* 회원 목록 */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-3xl text-white/30">
                group_off
              </span>
            </div>
            <p className="mt-4 text-sm text-white/50">
              {query ? "검색 결과가 없습니다" : "등록된 회원이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                    회원
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                    연락처
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                    주소
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/50">
                    결제 금액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                    가입일
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/50">
                    강좌
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/50">
                    교재
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-white/50">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {member.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.profileImageUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 text-sm font-medium text-white/70">
                            {initials(member.name || member.email)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <EditableField
                            value={member.name}
                            placeholder="이름 입력"
                            onSave={(v) => updateMember(member.id, "name", v)}
                          />
                          <p className="truncate text-xs text-white/50">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <EditableField
                        value={member.phone}
                        placeholder="연락처 입력"
                        onSave={(v) => updateMember(member.id, "phone", v)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <EditableField
                          value={member.address}
                          placeholder="주소 입력"
                          onSave={(v) => updateMember(member.id, "address", v)}
                        />
                        {(member.address || member.addressDetail) && (
                          <EditableField
                            value={member.addressDetail}
                            placeholder="상세주소"
                            onSave={(v) => updateMember(member.id, "addressDetail", v)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-white/70">
                      {member.totalPayment > 0 ? (
                        <span className="text-emerald-400">
                          ₩{member.totalPayment.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-white/70">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <a
                        href={`/admin/members/${member.id}/enrollments`}
                        className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:ring-2 hover:ring-white/20 ${
                          member.enrollmentCount > 0
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {member.enrollmentCount}
                      </a>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <a
                        href={`/admin/members/${member.id}/textbooks`}
                        className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:ring-2 hover:ring-white/20 ${
                          member.textbookCount > 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {member.textbookCount}
                      </a>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => deleteMember(member.id)}
                        disabled={deletingId === member.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        title="회원 삭제"
                      >
                        {deletingId === member.id ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: "16px" }}>
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                            delete
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/admin/members?page=${Math.max(1, currentPage - 1)}${query ? `&q=${query}` : ""}`}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              currentPage === 1
                ? "pointer-events-none text-white/30"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            ← 이전
          </Link>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Link
                  key={pageNum}
                  href={`/admin/members?page=${pageNum}${query ? `&q=${query}` : ""}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors ${
                    currentPage === pageNum
                      ? "bg-white text-black font-medium"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}
          </div>
          
          <Link
            href={`/admin/members?page=${Math.min(totalPages, currentPage + 1)}${query ? `&q=${query}` : ""}`}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              currentPage === totalPages
                ? "pointer-events-none text-white/30"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            다음 →
          </Link>
        </div>
      )}

      {/* 안내 문구 */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-xs text-white/40">
          💡 회원은 아임웹에서 회원가입하거나 구매할 때 웹훅을 통해 자동으로 등록됩니다.
          엑셀로 회원을 일괄 추가하려면 이메일(필수), 이름, 전화번호 열이 포함된 파일을 업로드하세요.
        </p>
      </div>
    </div>
  );
}

