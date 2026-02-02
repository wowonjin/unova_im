"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  adminEmail: string;
  adminName: string;
};

type LogEntry = {
  id: string;
  at: string;
  status: "info" | "success" | "error";
  title: string;
  detail?: string;
};

const STORAGE_KEYS = {
  customerKey: "admin-billing-customerKey",
  billingKey: "admin-billing-billingKey",
};

function nowKstLabel() {
  return new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function generateCustomerKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `cust-${Date.now()}-${rand}`;
}

function generateOrderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `TB-${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TB-${Date.now()}-${rand}`;
}

async function loadTossPaymentsV2(): Promise<any> {
  const w = window as any;
  if (w.TossPayments) return w.TossPayments;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://js.tosspayments.com/v2/standard"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("TOSS_SDK_LOAD_FAILED")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TOSS_SDK_LOAD_FAILED"));
    document.head.appendChild(script);
  });

  return (window as any).TossPayments;
}

export default function SubscriptionTestClient({ adminEmail, adminName }: Props) {
  const [clientKey, setClientKey] = useState<string>("");
  const [customerKey, setCustomerKey] = useState<string>("");
  const [billingKey, setBillingKey] = useState<string>("");
  const [amount, setAmount] = useState<number>(100);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60);
  const [orderName, setOrderName] = useState<string>("구독 테스트 (1분/100원)");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [configError, setConfigError] = useState<string>("");
  const [lastPopupError, setLastPopupError] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const paymentRef = useRef<any>(null);

  const appendLog = (entry: Omit<LogEntry, "id" | "at">) => {
    setLogs((prev) => [
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()),
        at: nowKstLabel(),
        ...entry,
      },
      ...prev,
    ].slice(0, 40));
  };

  useEffect(() => {
    const savedCustomerKey = localStorage.getItem(STORAGE_KEYS.customerKey) || "";
    const savedBillingKey = localStorage.getItem(STORAGE_KEYS.billingKey) || "";
    if (savedCustomerKey) setCustomerKey(savedCustomerKey);
    if (savedBillingKey) setBillingKey(savedBillingKey);
  }, []);

  useEffect(() => {
    if (customerKey) localStorage.setItem(STORAGE_KEYS.customerKey, customerKey);
  }, [customerKey]);

  useEffect(() => {
    if (billingKey) localStorage.setItem(STORAGE_KEYS.billingKey, billingKey);
  }, [billingKey]);

  useEffect(() => {
    paymentRef.current = null;
  }, [clientKey, customerKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/billing/config", { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.clientKey) {
          throw new Error(data?.error || "CLIENT_KEY_NOT_SET");
        }
        if (!cancelled) setClientKey(String(data.clientKey));
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "CLIENT_KEY_NOT_SET";
          setConfigError(msg);
          setLastPopupError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const ensurePayment = async (overrideCustomerKey?: string) => {
    if (!clientKey) throw new Error("CLIENT_KEY_NOT_READY");
    const key = overrideCustomerKey || customerKey;
    if (!key) throw new Error("CUSTOMER_KEY_NOT_SET");
    if (paymentRef.current) return paymentRef.current;

    const TossPayments = await loadTossPaymentsV2();
    const tossPayments = TossPayments(clientKey);
    const payment = tossPayments.payment({ customerKey: key });
    paymentRef.current = payment;
    return payment;
  };

  const handleBillingAuth = async () => {
    const nextCustomerKey = customerKey || generateCustomerKey();
    if (!customerKey) setCustomerKey(nextCustomerKey);
    setIsAuthLoading(true);
    try {
      setLastPopupError("");
      const payment = await ensurePayment(nextCustomerKey);
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/admin/subscription-test/success`,
        failUrl: `${window.location.origin}/admin/subscription-test/fail`,
        customerEmail: adminEmail,
        customerName: adminName,
      });
      appendLog({
        status: "info",
        title: "카드 등록 팝업 호출",
        detail: "정기구독(빌링) 카드 등록 요청",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
      setLastPopupError(msg);
      appendLog({
        status: "error",
        title: "카드 등록 요청 실패",
        detail: msg,
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const chargeOnce = async () => {
    if (isCharging) return;
    if (!billingKey || !customerKey) {
      appendLog({ status: "error", title: "결제 실패", detail: "billingKey/customerKey가 필요합니다." });
      return;
    }
    const safeAmount = Math.max(1, Math.round(amount));
    setIsCharging(true);
    try {
      const res = await fetch("/api/admin/billing/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingKey,
          customerKey,
          amount: safeAmount,
          orderName: orderName || "구독 테스트",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "BILLING_CHARGE_FAILED");
      }
      appendLog({
        status: "success",
        title: `결제 성공 (${safeAmount.toLocaleString("ko-KR")}원)`,
        detail: `paymentKey=${data?.paymentKey ?? "-"} / orderId=${data?.orderId ?? "-"}`,
      });
    } catch (e) {
      appendLog({
        status: "error",
        title: "결제 실패",
        detail: e instanceof Error ? e.message : "UNKNOWN_ERROR",
      });
    } finally {
      setIsCharging(false);
    }
  };

  const startSchedule = async () => {
    if (isRunning) return;
    const seconds = Math.max(10, Math.round(intervalSeconds));
    setIntervalSeconds(seconds);
    await chargeOnce();
    intervalRef.current = window.setInterval(chargeOnce, seconds * 1000);
    setIsRunning(true);
    appendLog({ status: "info", title: `자동 결제 시작 (${seconds}초 간격)` });
  };

  const stopSchedule = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isRunning) {
      setIsRunning(false);
      appendLog({ status: "info", title: "자동 결제 중지" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">구독 결제 테스트</h1>
          <p className="mt-1 text-sm text-white/60">
            관리자 전용 가상 구독 상품을 선택하고 정기구독 팝업을 띄워 테스트합니다.
          </p>
        </div>
      </div>

      {configError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          토스페이먼츠 클라이언트 키를 불러오지 못했습니다. `.env.local` 또는 운영 환경의
          `TOSS_BILLING_CLIENT_KEY`를 확인해주세요. (에러: {configError})
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold">프리미엄 플랜</h2>
            <p className="mt-2 text-sm text-white/60">
              매 1분마다 100원이 결제되는 가상 구독 상품입니다. 결제 수단 등록 후 정기 결제를 테스트할 수 있습니다.
            </p>
            <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/10 px-3 py-1">1분 주기</span>
              <span className="rounded-full border border-white/10 px-3 py-1">100원</span>
              <span className="rounded-full border border-white/10 px-3 py-1">자동 갱신</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedProduct(true)}
            className="rounded-lg bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/20"
          >
            이 상품 선택
          </button>
        </div>
      </div>

      {selectedProduct ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold">구독 시작하기</h3>
              <p className="mt-1 text-sm text-white/60">
                버튼을 누르면 토스페이먼츠 정기구독(빌링) 카드 등록 팝업이 열립니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBillingAuth}
              disabled={!clientKey || isAuthLoading}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAuthLoading ? "팝업 준비 중..." : "구독 시작하기"}
            </button>
          </div>

          {lastPopupError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              팝업 호출 중 오류가 발생했습니다: {lastPopupError}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs text-white/50">Customer Key</p>
              <p className="mt-1 text-sm text-white/80">
                {customerKey ? "자동 생성됨" : "구독 시작 시 자동 생성됩니다."}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs text-white/50">Billing Key</p>
              <p className="mt-1 text-sm text-white/80">
                {billingKey ? "발급 완료" : "카드 등록 후 자동 저장됩니다."}
              </p>
            </div>

            <div>
              <label className="text-xs text-white/50">결제 금액(원)</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs text-white/50">결제 간격(초)</label>
              <input
                type="number"
                min={10}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50">주문명</label>
            <input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>

            <div className="flex gap-2">
            <button
              type="button"
              onClick={startSchedule}
              disabled={isRunning || isCharging || !billingKey || !customerKey}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? "자동 결제 실행 중" : "자동 결제 시작"}
            </button>
            <button
              type="button"
              onClick={stopSchedule}
              disabled={!isRunning}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              중지
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">실행 로그</h2>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-xs text-white/50 hover:text-white"
          >
            로그 비우기
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">아직 실행 로그가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">{log.at}</span>
                  <span
                    className={
                      log.status === "success"
                        ? "text-xs text-emerald-300"
                        : log.status === "error"
                          ? "text-xs text-rose-300"
                          : "text-xs text-white/50"
                    }
                  >
                    {log.status === "success" ? "성공" : log.status === "error" ? "실패" : "정보"}
                  </span>
                </div>
                <div className="mt-1 font-medium text-white">{log.title}</div>
                {log.detail ? <div className="mt-1 text-xs text-white/60">{log.detail}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
