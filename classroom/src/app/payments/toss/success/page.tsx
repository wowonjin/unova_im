"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function TossSuccessInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("결제 승인 처리 중...");

  useEffect(() => {
    const paymentKey = sp.get("paymentKey") || "";
    const orderId = sp.get("orderId") || "";
    const amountRaw = sp.get("amount") || "";
    const amount = parseInt(amountRaw, 10);

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      setStatus("error");
      setMessage("결제 정보를 찾을 수 없습니다.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/payments/toss/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          setStatus("error");
          setMessage("결제 승인에 실패했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }
        setStatus("ok");
        setMessage("결제가 완료되었습니다. 이동 중...");
        const redirectTo = typeof json?.redirectTo === "string" ? json.redirectTo : "/dashboard";
        setTimeout(() => router.replace(redirectTo), 600);
      } catch {
        setStatus("error");
        setMessage("결제 승인 중 오류가 발생했습니다.");
      }
    })();
  }, [sp, router]);

  return (
    <div className="min-h-screen bg-[#161616] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-bold">토스페이먼츠</h1>
        <p className="mt-2 text-sm text-white/70">{message}</p>
        {status === "error" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => window.location.assign("/store")}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              스토어로
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TossSuccessPage() {
  // `useSearchParams()`는 CSR bail-out이 발생하므로 page 레벨에서 Suspense로 감싸야 합니다.
  // https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#161616] text-white flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-bold">토스페이먼츠</h1>
            <p className="mt-2 text-sm text-white/70">결제 승인 처리 중...</p>
          </div>
        </div>
      }
    >
      <TossSuccessInner />
    </Suspense>
  );
}


