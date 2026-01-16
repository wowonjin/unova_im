"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  loginType: "kakao" | "naver" | "email" | "none" | "unknown";
  hasEmailPassword: boolean;
  adminPassword: string | null;
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
  loginStats?: {
    kakao: number;
    naver: number;
    email: number;
  };
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
        className="w-full rounded-lg border border-white/20 bg-transparent px-2 py-0.5 text-[13px] text-white outline-none focus:border-white/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex w-full items-center gap-1 text-left text-[13px] text-white/70 hover:text-white"
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

function formatLoginType(t: Member["loginType"]) {
  switch (t) {
    case "kakao":
      return { label: "카카오", className: "bg-[#FEE500]/20 text-[#FEE500]" };
    case "naver":
      return { label: "네이버", className: "bg-emerald-500/20 text-emerald-400" };
    case "email":
      return { label: "일반", className: "bg-white/10 text-white/70" };
    case "none":
      return { label: "없는 회원정보", className: "bg-red-500/15 text-red-400" };
    default:
      return { label: "기타", className: "bg-white/5 text-white/50" };
  }
}

export default function MembersClient({
  members: initialMembers,
  totalCount,
  currentPage,
  totalPages,
  query,
  loginStats,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [searchValue, setSearchValue] = useState(query);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 페이지 이동(쿼리스트링 변경) 시에도 서버에서 내려온 members로 테이블을 동기화해야 함
  // (현재 파일은 Client Component라서 useState 초기값만으로는 페이지 전환 때 리스트가 안 바뀔 수 있음)
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  const paginationHref = useMemo(() => {
    return (page: number) => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      if (query.trim()) sp.set("q", query.trim());
      return `/admin/members?${sp.toString()}`;
    };
  }, [query]);

  const Pagination = useMemo(() => {
    if (totalPages <= 1) return null;

    const pageNums = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      if (totalPages <= 5) return i + 1;
      if (currentPage <= 3) return i + 1;
      if (currentPage >= totalPages - 2) return totalPages - 4 + i;
      return currentPage - 2 + i;
    });

    return (
      <div className="flex items-center justify-center gap-2 sm:justify-end">
        <Link
          href={paginationHref(Math.max(1, currentPage - 1))}
          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
            currentPage === 1 ? "pointer-events-none text-white/30" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          이전
        </Link>

        <div className="flex items-center gap-1">
          {pageNums.map((pageNum) => (
            <Link
              key={pageNum}
              href={paginationHref(pageNum)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors ${
                currentPage === pageNum ? "bg-white text-black font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {pageNum}
            </Link>
          ))}
        </div>

        <Link
          href={paginationHref(Math.min(totalPages, currentPage + 1))}
          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
            currentPage === totalPages
              ? "pointer-events-none text-white/30"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          다음
        </Link>
      </div>
    );
  }, [currentPage, paginationHref, totalPages]);

  const loginStatsView = useMemo(() => {
    if (!loginStats) return null;
    const total = totalCount || 0;
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    const fmt = (n: number) => `${n.toLocaleString()}명 (${pct(n).toFixed(1)}%)`;

    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/70">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE500]/15 px-2 py-1 font-medium text-[#FEE500]">
          카카오 <span className="text-white/80">{fmt(loginStats.kakao)}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 font-medium text-emerald-400">
          네이버 <span className="text-white/80">{fmt(loginStats.naver)}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 font-medium text-white/70">
          일반 <span className="text-white/80">{fmt(loginStats.email)}</span>
        </span>
      </div>
    );
  }, [loginStats, totalCount]);

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

  const updateMemberPassword = async (memberId: string, newPassword: string) => {
    const p = (newPassword || "").trim();
    if (p.length < 8) {
      alert("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    const res = await fetch("/api/admin/members/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, password: p }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error("SET_PASSWORD_FAILED");

    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, hasEmailPassword: true, adminPassword: p } : m)));
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
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">모든 회원</h1>
          <p className="mt-1 text-[13px] text-white/60">
            총 {totalCount.toLocaleString()}명의 회원이 등록되어 있습니다
          </p>
          {loginStatsView}
        </div>

        <div className="flex items-center gap-2">
          {/* 엑셀 내보내기 */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-transparent px-3.5 py-2 text-[13px] font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white"
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
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-transparent px-3.5 py-2 text-[13px] font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white disabled:opacity-50"
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
        <div className="rounded-xl border border-emerald-500/20 bg-transparent px-3.5 py-2.5 text-[13px]">
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

      {/* 검색 + 페이지네이션(상단 우측) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="이메일, 이름, 전화번호로 검색..."
            className="w-full rounded-xl border border-white/15 bg-transparent py-2.5 pl-10 pr-3.5 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
          <svg
            className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40"
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

        {Pagination}
      </div>

      {/* 회원 목록 */}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-transparent">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-[28px] text-white/30">
                group_off
              </span>
            </div>
            <p className="mt-4 text-[13px] text-white/50">
              {query ? "검색 결과가 없습니다" : "등록된 회원이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-transparent">
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-white/50">
                    회원
                  </th>
                  <th className="px-3.5 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-white/50">
                    로그인
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-white/50">
                    연락처
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-white/50">
                    주소
                  </th>
                  <th className="px-3.5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-white/50">
                    결제 금액
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-white/50">
                    가입일
                  </th>
                  <th className="px-3.5 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-white/50">
                    강좌
                  </th>
                  <th className="px-3.5 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-white/50">
                    교재
                  </th>
                  <th className="px-3.5 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-white/50">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        {member.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.profileImageUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 text-[13px] font-medium text-white/70">
                            {initials(member.name || member.email)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <EditableField
                            value={member.name}
                            placeholder="이름 입력"
                            onSave={(v) => updateMember(member.id, "name", v)}
                          />
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <p className="truncate text-xs text-white/50">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {(() => {
                        if (member.loginType === "none") return null; // 요구사항: '없는 회원정보' 버튼(배지) 숨김
                        const v = formatLoginType(member.loginType);
                        return (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${v.className}`}>
                            {v.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3.5 py-3">
                      <EditableField
                        value={member.phone}
                        placeholder="연락처 입력"
                        onSave={(v) => updateMember(member.id, "phone", v)}
                      />
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {!member.hasEmailPassword && (
                            <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                              비번 없음
                            </span>
                          )}
                          {member.hasEmailPassword && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[12px] text-white/70">
                                비밀번호:
                                <span className="ml-1 font-mono text-[12px] text-white">
                                  {member.adminPassword ?? "-"}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-white/60">비밀번호</span>
                          <div className="min-w-0 flex-1">
                            <EditableField
                              value={member.adminPassword}
                              placeholder="비밀번호 입력(8자 이상)"
                              onSave={(v) => updateMemberPassword(member.id, v)}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
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
                    <td className="px-3.5 py-3 text-right text-[13px] font-medium text-white/70">
                      {member.totalPayment > 0 ? (
                        <span className="text-emerald-400">
                          ₩{member.totalPayment.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[13px] text-white/70">
                      {formatDateTime(member.createdAt)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
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
                    <td className="px-3.5 py-3 text-center">
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
                    <td className="px-3.5 py-3 text-center">
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

