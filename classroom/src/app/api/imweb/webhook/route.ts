import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncImwebOrderToEnrollments } from "@/lib/imweb";
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
  const raw = await req.text().catch(() => "");
  const cfg = getImwebSignatureConfig();
  const signature = cfg ? req.headers.get(cfg.headerName) : null;
  if (!verifyHmacSignature(raw, signature, cfg)) {
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
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

  // 결제완료 등 특정 이벤트만 처리(환경변수로 allow list 가능)
  if (shouldProcessEvent(eventType) && orderNo) {
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


