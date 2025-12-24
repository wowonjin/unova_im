"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  status: string;
  startAt: string;
  endAt: string;
};

type Course = {
  id: string;
  title: string;
  enrollmentDays: number;
};

type Props = {
  memberId: string;
  enrollments: Enrollment[];
  availableCourses: Course[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

export default function MemberEnrollmentsClient({
  memberId,
  enrollments: initialEnrollments,
  availableCourses,
}: Props) {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!selectedCourse) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/members/enrollments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, courseId: selectedCourse }),
      });
      if (!res.ok) throw new Error("Add failed");
      setSelectedCourse("");
      router.refresh();
    } catch {
      alert("추가 중 오류가 발생했습니다.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    if (!confirm("정말 이 강좌 등록을 삭제하시겠습니까?")) return;
    setRemovingId(enrollmentId);
    try {
      const res = await fetch("/api/admin/members/enrollments/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      });
      if (!res.ok) throw new Error("Remove failed");
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 강좌 추가 */}
      <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-5">
        <h2 className="text-sm font-medium text-white/70">강좌 추가</h2>
        <div className="mt-3 flex items-center gap-3">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
          >
            <option value="">강좌 선택...</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.enrollmentDays}일)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedCourse || adding}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {adding ? "추가 중..." : "추가"}
          </button>
        </div>
        {availableCourses.length === 0 && (
          <p className="mt-2 text-xs text-white/40">모든 강좌에 이미 등록되어 있습니다.</p>
        )}
      </div>

      {/* 등록된 강좌 목록 */}
      <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-medium text-white">
            등록된 강좌 ({enrollments.length})
          </h2>
        </div>
        
        {enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-3xl text-white/20">school</span>
            <p className="mt-2 text-sm text-white/40">등록된 강좌가 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">{e.courseTitle}</p>
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

