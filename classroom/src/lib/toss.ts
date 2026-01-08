import crypto from "crypto";

export function generateTossOrderId(): string {
  // Toss orderId: unique within merchant, keep it short and URL-safe
  // Example: TP-20251225-AB12CD34
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TP-${y}${m}${day}-${rand}`;
}

export function getTossClientKey(): string {
  const v = process.env.TOSS_CLIENT_KEY || "";
  if (!v) throw new Error("TOSS_CLIENT_KEY_NOT_SET");

  // Toss 결제위젯(v2/v1) SDK는 "결제위젯 연동 키(클라이언트 키)"만 지원합니다.
  // 실수로 시크릿키/다른 종류의 키(API 개별 연동 키 등)를 넣으면 SDK가 런타임에서 거절합니다.
  // 보편적으로 client key는 test_ck_/live_ck_ 형태지만, 포맷이 달라질 수 있어
  // "차단"은 시크릿키 오입력만 하고 나머지는 경고로만 처리합니다.
  const lower = v.toLowerCase();
  if (lower.startsWith("test_sk_") || lower.startsWith("live_sk_")) {
    throw new Error("TOSS_CLIENT_KEY_IS_SECRET_KEY");
  }
  // 결제위젯 연동 키(클라이언트 키)는 환경/계약(MID)에 따라 prefix가 다를 수 있습니다.
  // - 일반적으로: test_ck_/live_ck_
  // - 일부 케이스(문서/해외 간편결제 등): test_gck_..., test_gck_docs_... 형태도 존재
  const looksLikeWidgetClientKey =
    lower.includes("_ck_") ||
    lower.includes("_gck_") ||
    lower.startsWith("test_ck_") ||
    lower.startsWith("live_ck_") ||
    lower.startsWith("test_gck_") ||
    lower.startsWith("live_gck_");

  if (!looksLikeWidgetClientKey) {
    // eslint-disable-next-line no-console
    console.warn("[toss] TOSS_CLIENT_KEY does not look like a widget client key. The SDK may reject it.");
  }
  return v;
}

// 토스 결제창(standard)용 API 개별 연동 키(클라이언트 키)
// - test_ck_/live_ck_ 계열을 권장. gck(위젯 키)는 표준 결제창에서 거절됩니다.
export function getTossPaymentClientKey(): string {
  const v = process.env.TOSS_PAYMENT_CLIENT_KEY || process.env.TOSS_CLIENT_KEY || "";
  if (!v) throw new Error("TOSS_PAYMENT_CLIENT_KEY_NOT_SET");

  const lower = v.toLowerCase();
  if (lower.startsWith("test_sk_") || lower.startsWith("live_sk_")) {
    throw new Error("TOSS_PAYMENT_CLIENT_KEY_IS_SECRET_KEY");
  }

  const looksLikePaymentClientKey =
    lower.includes("_ck_") ||
    lower.startsWith("test_ck_") ||
    lower.startsWith("live_ck_");

  if (!looksLikePaymentClientKey) {
    // eslint-disable-next-line no-console
    console.warn("[toss] TOSS_PAYMENT_CLIENT_KEY does not look like an API/payment client key (test_ck_/live_ck_). The SDK may reject it.");
  }
  // gck(위젯용)일 때는 토스에서 표준 결제창 호출 시 거절 메시지를 주므로 미리 에러 처리
  if (lower.includes("_gck_") || lower.startsWith("test_gck_") || lower.startsWith("live_gck_")) {
    throw new Error("TOSS_PAYMENT_CLIENT_KEY_IS_WIDGET_KEY");
  }

  return v;
}

export function getTossSecretKey(): string {
  const v = process.env.TOSS_SECRET_KEY || "";
  if (!v) throw new Error("TOSS_SECRET_KEY_NOT_SET");
  return v;
}

export function basicAuthHeader(secretKey: string): string {
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
}


