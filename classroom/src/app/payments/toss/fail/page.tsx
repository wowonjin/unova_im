"use client";

import { useSearchParams } from "next/navigation";

export default function TossFailPage() {
  const sp = useSearchParams();
  const code = sp.get("code");
  const message = sp.get("message");

  return (
    <div className="min-h-screen bg-[#161616] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-bold">결제가 취소/실패했습니다</h1>
        <div className="mt-3 space-y-1 text-sm text-white/70">
          {code && <p>코드: {code}</p>}
          {message && <p>메시지: {message}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => window.location.assign("/store")}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            스토어로
          </button>
          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80"
          >
            뒤로가기
          </button>
        </div>
      </div>
    </div>
  );
}


