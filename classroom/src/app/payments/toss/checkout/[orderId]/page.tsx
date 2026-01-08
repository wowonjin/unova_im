"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OrderPayload = {
  clientKey: string;
  customerKey: string;
  order: {
    orderId: string;
    orderName: string;
    amount: number;
    successUrl: string;
    failUrl: string;
  };
};

async function loadTossPaymentsV2(): Promise<any> {
  const w = window as any;
  if (w.TossPayments) return w.TossPayments;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-toss-payments-v2="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("TOSS_V2_SCRIPT_LOAD_FAILED")));
      return;
    }

    const s = document.createElement("script");
    // Toss Payments JavaScript SDK v2 (Standard)
    // https://docs.tosspayments.com/sdk/v2/js
    s.src = "https://js.tosspayments.com/v2/standard";
    s.async = true;
    s.setAttribute("data-toss-payments-v2", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("TOSS_V2_SCRIPT_LOAD_FAILED"));
    document.head.appendChild(s);
  });

  return (window as any).TossPayments;
}

export default function TossCheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = useMemo(() => String(params?.orderId || ""), [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<null | { code: string; message: string }>(null);
  const [data, setData] = useState<OrderPayload | null>(null);
  const [isUiReady, setIsUiReady] = useState(false);
  const widgetsRef = useRef<any>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setData(null);
      try {
        const res = await fetch(`/api/payments/toss/order/${encodeURIComponent(orderId)}`, { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          const code = json?.error ? String(json.error) : `HTTP_${res.status}`;
          const message =
            code === "UNAUTHORIZED"
              ? "로그인이 필요합니다."
              : code === "ORDER_NOT_FOUND"
                ? "주문 정보를 찾을 수 없습니다."
                : code === "TOSS_CLIENT_KEY_NOT_SET"
                  ? "토스 클라이언트 키가 설정되지 않았습니다."
            : code === "TOSS_CLIENT_KEY_IS_SECRET_KEY"
                    ? "토스 클라이언트 키에 시크릿 키가 들어있습니다. '결제위젯 연동 키'의 클라이언트 키로 교체해주세요."
            : code === "TOSS_CLIENT_KEY_NOT_WIDGET_CLIENT_KEY"
                      ? "토스 결제위젯 연동 키(클라이언트 키)로 설정해주세요. (API 개별 연동 키는 지원하지 않습니다)"
                  : "결제 정보를 불러오지 못했습니다.";
          if (!cancelled) setErr({ code, message });
          return;
        }
        if (!cancelled) setData(json as OrderPayload);
      } catch (e) {
        if (!cancelled) setErr({ code: "FETCH_FAILED", message: "결제 정보를 불러오는 중 오류가 발생했습니다." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    (async () => {
      try {
        setIsUiReady(false);
        widgetsRef.current = null;

        // 컨테이너 초기화(뒤로가기/재진입 등)
        document.getElementById("payment-method")?.replaceChildren();
        document.getElementById("agreement")?.replaceChildren();

        const TossPayments = await loadTossPaymentsV2();
        if (cancelled) return;

        // ------ SDK 초기화 & 위젯 인스턴스 생성 (v2) ------
        // https://docs.tosspayments.com/sdk/v2/js#tosspaymentswidgets
        const tossPayments = TossPayments(data.clientKey);
        const widgets = tossPayments.widgets({ customerKey: data.customerKey });
        widgetsRef.current = widgets;

        // ------ 결제 금액 설정 (render 전에 필수) ------
        // https://docs.tosspayments.com/sdk/v2/js#widgetssetamount
        await widgets.setAmount({ currency: "KRW", value: data.order.amount });

        // ------ 결제 UI / 약관 UI 렌더링 ------
        // https://docs.tosspayments.com/sdk/v2/js#widgetsrenderpaymentmethods
        // https://docs.tosspayments.com/sdk/v2/js#widgetsrenderagreement
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);

        if (!cancelled) setIsUiReady(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[toss checkout] widget init failed", e);
        if (!cancelled) setErr({ code: "WIDGET_INIT_FAILED", message: "결제 위젯을 불러오지 못했습니다." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  const handlePay = async () => {
    if (!data) return;
    try {
      const widgets = widgetsRef.current;
      if (!widgets?.requestPayment) throw new Error("TOSS_WIDGETS_NOT_READY");
      if (!isUiReady) throw new Error("TOSS_WIDGETS_UI_NOT_READY");

      // https://docs.tosspayments.com/sdk/v2/js#widgetsrequestpayment
      await widgets.requestPayment({
        orderId: data.order.orderId,
        orderName: data.order.orderName,
        successUrl: data.order.successUrl,
        failUrl: data.order.failUrl,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[toss checkout] requestPayment failed", e);
      alert("결제 요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="unova-toss-payment-popup min-h-screen bg-[#f6f7fb] text-black">
      <div className="mx-auto max-w-[720px] px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[18px] font-bold">결제하기</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-black/5 px-3 py-2 text-[13px] font-semibold hover:bg-black/10"
          >
            뒤로가기
          </button>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-5 w-40 rounded bg-black/5 animate-pulse" />
              <div className="h-10 rounded bg-black/5 animate-pulse" />
              <div className="h-10 rounded bg-black/5 animate-pulse" />
              <div className="h-12 rounded bg-black/5 animate-pulse" />
            </div>
          ) : err ? (
            <div>
              <p className="text-[15px] font-bold text-rose-600">결제 준비 실패</p>
              <p className="mt-2 text-[13px] text-black/70">{err.message}</p>
              <p className="mt-1 text-[12px] text-black/45">(에러코드: {err.code})</p>
            </div>
          ) : data ? (
            <>
              <div className="mb-4">
                <p className="text-[13px] text-black/60">주문명</p>
                <p className="text-[16px] font-semibold text-black/80">{data.order.orderName}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[13px] text-black/60">결제 금액</span>
                  <span className="text-[18px] font-semibold text-black/80">{data.order.amount.toLocaleString()}원</span>
                </div>
              </div>

              {/* 토스 결제위젯 컨테이너 */}
              <div id="payment-method" className="rounded-xl border border-black/10 bg-white p-3" />
              <div className="mt-3 rounded-xl border border-black/10 bg-white p-3" id="agreement" />

              <button
                type="button"
                onClick={handlePay}
                disabled={!isUiReady}
                className={`mt-5 w-full rounded-xl px-4 py-3 font-bold transition-colors ${
                  isUiReady ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]" : "bg-black/10 text-black/40 cursor-not-allowed"
                }`}
              >
                {isUiReady ? "결제하기" : "결제 UI 로딩중..."}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


