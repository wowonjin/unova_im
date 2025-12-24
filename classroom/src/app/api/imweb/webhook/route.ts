import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncImwebOrderToEnrollments, syncImwebMemberToUser } from "@/lib/imweb";
import { getImwebSignatureConfig, verifyHmacSignature } from "@/lib/webhook-signature";

export const runtime = "nodejs";

function parseJson(raw: string) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickString(...vals: unknown[]) {
  for (const v of vals) if (typeof v === "string" && v.trim().length) return v.trim();
  return null;
}

function shouldProcessEvent(eventType: string | null) {
  const raw = process.env.IMWEB_WEBHOOK_EVENTS;
  if (!raw) return true; // 미설정이면 모두 수신(개발 편의)
  const allow = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!eventType) return false;
  return allow.includes(eventType);
}

export async function POST(req: Request) {
  console.log("[Webhook] 웹훅 요청 수신됨");
  
  // 보안:
  // - IMWEB_WEBHOOK_SECRET 설정 시: HMAC 서명 검증
  // - 아니면 IMWEB_WEBHOOK_TOKEN 설정 시: ?token= 또는 x-imweb-token 헤더로 검증
  // - 둘 다 없으면: 개발 편의상 dev에서는 허용, production에서는 차단
  const url = new URL(req.url);
  const tokenEnv = process.env.IMWEB_WEBHOOK_TOKEN || null;
  const tokenProvided = (req.headers.get("x-imweb-token") || url.searchParams.get("token") || "").trim();

  const raw = await req.text().catch(() => "");
  console.log("[Webhook] 페이로드:", raw.slice(0, 500));
  
  const cfg = getImwebSignatureConfig();
  const signature = cfg ? req.headers.get(cfg.headerName) : null;
  
  console.log("[Webhook] 시그니처 설정:", cfg ? "있음" : "없음");
  console.log("[Webhook] 토큰 환경변수:", tokenEnv ? "있음" : "없음");

  if (cfg) {
    if (!verifyHmacSignature(raw, signature, cfg)) {
      console.log("[Webhook] 시그니처 검증 실패");
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }
    console.log("[Webhook] 시그니처 검증 성공");
  } else if (tokenEnv) {
    if (!tokenProvided || tokenProvided !== tokenEnv) {
      console.log("[Webhook] 토큰 검증 실패");
      return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 401 });
    }
    console.log("[Webhook] 토큰 검증 성공");
  } else if (process.env.NODE_ENV === "production") {
    console.log("[Webhook] 보안 설정 없음 - 프로덕션에서 차단");
    return NextResponse.json({ ok: false, error: "WEBHOOK_NOT_CONFIGURED" }, { status: 401 });
  }

  const payload = parseJson(raw);
  const payloadObj = getObj(payload);
  const dataObj = getObj(payloadObj?.data);

  const eventType = pickString(payloadObj?.event, payloadObj?.type, payloadObj?.eventType);
  const orderNo = pickString(
    dataObj?.order_no,
    dataObj?.orderNo,
    payloadObj?.order_no,
    payloadObj?.orderNo,
    dataObj?.order_id,
    payloadObj?.order_id
  );
  const memberCode = pickString(dataObj?.member_code, payloadObj?.member_code);

  console.log("[Webhook] 이벤트 타입:", eventType);
  console.log("[Webhook] 주문번호:", orderNo);
  console.log("[Webhook] 회원코드:", memberCode);

  const orderEvent = await prisma.orderEvent.create({
    data: {
      provider: "imweb",
      eventType: eventType ?? "UNKNOWN",
      payload: payload ?? raw,
      orderNo,
      memberCode,
    },
  });
  console.log("[Webhook] DB에 이벤트 저장됨:", orderEvent.id);

  // 이벤트 타입에 따라 처리 분기
  const isMemberEvent = eventType?.toLowerCase().includes("member") || 
                        eventType?.includes("회원") ||
                        ["member_created", "member_updated", "member_deleted"].includes(eventType?.toLowerCase() ?? "");
  console.log("[Webhook] 회원 이벤트 여부:", isMemberEvent);
  
  if (isMemberEvent && memberCode) {
    // 회원 생성/수정 이벤트 → 회원 정보 동기화
    console.log("[Webhook] 회원 이벤트 처리 시작:", memberCode);
    try {
      // 회원 삭제 이벤트는 별도 처리 없이 로그만 남김
      if (eventType?.toLowerCase().includes("delete") || eventType?.includes("삭제")) {
        console.log("[Webhook] 회원 삭제 이벤트 - 로그만 기록");
        await prisma.orderEvent.update({ 
          where: { id: orderEvent.id }, 
          data: { processedAt: new Date() } 
        });
      } else {
        console.log("[Webhook] 회원 정보 동기화 시작");
        await syncImwebMemberToUser(memberCode);
        console.log("[Webhook] 회원 정보 동기화 완료");
        await prisma.orderEvent.update({ 
          where: { id: orderEvent.id }, 
          data: { processedAt: new Date() } 
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("[Webhook] 회원 처리 에러:", msg);
      await prisma.orderEvent.update({
        where: { id: orderEvent.id },
        data: { processingError: msg },
      });
    }
  } else if (shouldProcessEvent(eventType) && orderNo) {
    // 주문 이벤트 → 수강생 등록
    try {
      await syncImwebOrderToEnrollments(orderNo);
      await prisma.orderEvent.update({ where: { id: orderEvent.id }, data: { processedAt: new Date() } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.orderEvent.update({
        where: { id: orderEvent.id },
        data: { processingError: msg },
      });
    }
  }

  return NextResponse.json({ ok: true });
}


