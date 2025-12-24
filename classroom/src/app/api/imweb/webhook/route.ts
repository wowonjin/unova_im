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
  // 보안:
  // - IMWEB_WEBHOOK_SECRET 설정 시: HMAC 서명 검증
  // - 아니면 IMWEB_WEBHOOK_TOKEN 설정 시: ?token= 또는 x-imweb-token 헤더로 검증
  // - 둘 다 없으면: 개발 편의상 dev에서는 허용, production에서는 차단
  const url = new URL(req.url);
  const tokenEnv = process.env.IMWEB_WEBHOOK_TOKEN || null;
  const tokenProvided = (req.headers.get("x-imweb-token") || url.searchParams.get("token") || "").trim();

  const raw = await req.text().catch(() => "");
  const cfg = getImwebSignatureConfig();
  const signature = cfg ? req.headers.get(cfg.headerName) : null;

  if (cfg) {
    if (!verifyHmacSignature(raw, signature, cfg)) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }
  } else if (tokenEnv) {
    if (!tokenProvided || tokenProvided !== tokenEnv) {
      return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
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

  const orderEvent = await prisma.orderEvent.create({
    data: {
      provider: "imweb",
      eventType: eventType ?? "UNKNOWN",
      payload: payload ?? raw,
      orderNo,
      memberCode,
    },
  });

  // 이벤트 타입에 따라 처리 분기
  const isMemberEvent = eventType?.toLowerCase().includes("member") || 
                        eventType?.includes("회원") ||
                        ["member_created", "member_updated", "member_deleted"].includes(eventType?.toLowerCase() ?? "");
  
  if (isMemberEvent && memberCode) {
    // 회원 생성/수정 이벤트 → 회원 정보 동기화
    try {
      // 회원 삭제 이벤트는 별도 처리 없이 로그만 남김
      if (eventType?.toLowerCase().includes("delete") || eventType?.includes("삭제")) {
        await prisma.orderEvent.update({ 
          where: { id: orderEvent.id }, 
          data: { processedAt: new Date() } 
        });
      } else {
        await syncImwebMemberToUser(memberCode);
        await prisma.orderEvent.update({ 
          where: { id: orderEvent.id }, 
          data: { processedAt: new Date() } 
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
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


