"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Entitlement = {
  id: string;
  textbookId: string;
  textbookTitle: string;
  status: string;
  startAt: string;
  endAt: string;
};

type Textbook = {
  id: string;
  title: string;
  entitlementDays: number;
};

type Props = {
  memberId: string;
  entitlements: Entitlement[];
  availableTextbooks: Textbook[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

export default function MemberTextbooksClient({
  memberId,
  entitlements: initialEntitlements,
  availableTextbooks,
}: Props) {
  const router = useRouter();
  const [entitlements, setEntitlements] = useState(initialEntitlements);
  const [selectedTextbook, setSelectedTextbook] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // NOTE: 네이티브 <select> 드롭다운(옵션 목록)은 브라우저/OS가 흰 배경으로 렌더링하는 경우가 있어
  // select에 text-white가 걸려 있으면 옵션 텍스트도 흰색으로 보이며 가독성이 깨질 수 있습니다.
  // 옵션에만 검정 텍스트/흰 배경을 명시해 안전하게 표시합니다.
  const optionStyle: CSSProperties = { backgroundColor: "#ffffff", color: "#111827" };

  const handleAdd = async () => {
    if (!selectedTextbook) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/members/textbooks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, textbookId: selectedTextbook }),
      });
      if (!res.ok) throw new Error("Add failed");
      setSelectedTextbook("");
      router.refresh();
    } catch {
      alert("추가 중 오류가 발생했습니다.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (entitlementId: string) => {
    if (!confirm("정말 이 교재 권한을 삭제하시겠습니까?")) return;
    setRemovingId(entitlementId);
    try {
      const res = await fetch("/api/admin/members/textbooks/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entitlementId }),
      });
      if (!res.ok) throw new Error("Remove failed");
      setEntitlements((prev) => prev.filter((e) => e.id !== entitlementId));
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 교재 추가 */}
      <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-5">
        <h2 className="text-sm font-medium text-white/70">교재 추가</h2>
        <div className="mt-3 flex items-center gap-3">
          <select
            value={selectedTextbook}
            onChange={(e) => setSelectedTextbook(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
          >
            <option value="" style={optionStyle}>
              교재 선택...
            </option>
            {availableTextbooks.map((t) => (
              <option key={t.id} value={t.id} style={optionStyle}>
                {t.title} ({t.entitlementDays}일)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedTextbook || adding}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {adding ? "추가 중..." : "추가"}
          </button>
        </div>
        {availableTextbooks.length === 0 && (
          <p className="mt-2 text-xs text-white/40">모든 교재에 이미 권한이 있습니다.</p>
        )}
      </div>

      {/* 등록된 교재 목록 */}
      <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-medium text-white">
            보유 교재 ({entitlements.length})
          </h2>
        </div>
        
        {entitlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-3xl text-white/20">menu_book</span>
            <p className="mt-2 text-sm text-white/40">보유한 교재가 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {entitlements.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">{e.textbookTitle}</p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {formatDate(e.startAt)} ~ {formatDate(e.endAt)}
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      e.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/10 text-white/50"
                    }`}>
                      {e.status === "ACTIVE" ? "활성" : e.status}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(e.id)}
                  disabled={removingId === e.id}
                  className="rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  {removingId === e.id ? "삭제 중..." : "삭제"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

