"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type IssueState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; billingKey: string; customerKey: string }
  | { status: "error"; message: string };

export default function SubscriptionBillingSuccessClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<IssueState>({ status: "idle" });

  useEffect(() => {
    const authKey = searchParams.get("authKey") || "";
    const customerKey = searchParams.get("customerKey") || "";
    if (!authKey || !customerKey) {
      setState({ status: "error", message: "authKey/customerKey가 없습니다." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/admin/billing/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.billingKey) {
          throw new Error(data?.error || "BILLING_ISSUE_FAILED");
        }
        if (cancelled) return;
        localStorage.setItem("admin-billing-customerKey", customerKey);
        localStorage.setItem("admin-billing-billingKey", data.billingKey);
        setState({ status: "success", billingKey: data.billingKey, customerKey });
      } catch (e) {
        if (!cancelled) {
          setState({ status: "error", message: e instanceof Error ? e.message : "UNKNOWN_ERROR" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-[24px] font-bold">카드 등록 결과</h1>

      {state.status === "loading" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
          빌링키를 발급하는 중입니다...
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          빌링키 발급에 실패했습니다. {state.message}
        </div>
      )}

      {state.status === "success" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
          빌링키가 발급되었습니다. 테스트 페이지로 돌아가 자동 결제를 시작하세요.
          <div className="mt-3 text-xs text-emerald-100/70">
            customerKey: {state.customerKey}
            <br />
            billingKey: {state.billingKey}
          </div>
        </div>
      )}

      <Link
        href="/admin/subscription-test"
        className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        테스트 페이지로 돌아가기
      </Link>
    </div>
  );
}
