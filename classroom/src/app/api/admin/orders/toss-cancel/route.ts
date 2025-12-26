import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";
import { basicAuthHeader, getTossSecretKey } from "@/lib/toss";

export const runtime = "nodejs";

const Schema = z.object({
  orderNo: z.string().min(1),
  reason: z.string().min(1).max(200).default("고객 요청"),
  cancelAmount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const n = typeof v === "number" ? v : parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
});

export async function POST(req: Request) {
  await requireAdminUser();

  const form = await req.formData();
  const parsed = Schema.safeParse({
    orderNo: form.get("orderNo"),
    reason: form.get("reason") || "고객 요청",
    cancelAmount: form.get("cancelAmount"),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { orderNo, reason, cancelAmount } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      id: true,
      orderNo: true,
      status: true,
      provider: true,
      providerPaymentKey: true,
      userId: true,
      productType: true,
      courseId: true,
      textbookId: true,
      amount: true,
      refundedAmount: true,
    },
  });

  if (!order) return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
  if (order.provider !== "toss" || !order.providerPaymentKey) {
    return NextResponse.json({ ok: false, error: "NOT_TOSS_ORDER" }, { status: 400 });
  }
  if (order.status !== "COMPLETED") {
    return NextResponse.json({ ok: false, error: "NOT_COMPLETED" }, { status: 400 });
  }

  const remaining = Math.max(0, order.amount - (order.refundedAmount || 0));
  const cancelAmt = cancelAmount ?? remaining;
  if (!Number.isFinite(cancelAmt) || cancelAmt <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_CANCEL_AMOUNT" }, { status: 400 });
  }
  if (cancelAmt > remaining) {
    return NextResponse.json({ ok: false, error: "CANCEL_AMOUNT_EXCEEDS_REMAINING" }, { status: 400 });
  }

  // Toss cancel API
  const secretKey = getTossSecretKey();
  const cancelBody: Record<string, unknown> = { cancelReason: reason };
  // 부분취소: cancelAmount 전달
  if (cancelAmt !== remaining) cancelBody.cancelAmount = cancelAmt;
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(order.providerPaymentKey)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cancelBody),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[toss cancel] failed", res.status, json);
    return NextResponse.json({ ok: false, error: "TOSS_CANCEL_FAILED", details: json }, { status: 400 });
  }

  const nextRefundedAmount = (order.refundedAmount || 0) + cancelAmt;
  const isFullyRefunded = nextRefundedAmount >= order.amount;

  // fully refunded => revoke access
  if (isFullyRefunded) {
    const now = new Date();
    if (order.productType === "COURSE" && order.courseId) {
      await prisma.enrollment.updateMany({
        where: { userId: order.userId, courseId: order.courseId, status: "ACTIVE" },
        data: { status: "REVOKED", endAt: now },
      });
    }
    if (order.productType === "TEXTBOOK" && order.textbookId) {
      await prisma.textbookEntitlement.updateMany({
        where: { userId: order.userId, textbookId: order.textbookId, status: "ACTIVE" },
        data: { status: "REVOKED", endAt: now },
      });
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: isFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
      providerPayload: json,
      refundedAmount: nextRefundedAmount,
      ...(isFullyRefunded ? { enrolled: false, enrolledAt: null } : {}),
    },
  });

  return NextResponse.redirect(new URL("/admin/orders", req.url));
}


