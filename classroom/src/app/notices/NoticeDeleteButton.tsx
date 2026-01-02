"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  noticeId: string;
  redirectTo: string;
  className?: string;
};

export default function NoticeDeleteButton({ noticeId, redirectTo, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (loading) return;
    const ok = window.confirm("이 공지사항을 삭제할까요? (되돌릴 수 없습니다)");
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/notices/${encodeURIComponent(noticeId)}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) throw new Error("DELETE_FAILED");
      router.push(redirectTo);
      router.refresh();
    } catch {
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[13px] font-semibold text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
      }
    >
      <span className="material-symbols-outlined text-[16px]">delete</span>
      삭제
    </button>
  );
}


