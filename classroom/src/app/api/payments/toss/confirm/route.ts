import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { basicAuthHeader, getTossSecretKey } from "@/lib/toss";

export const runtime = "nodejs";

const Schema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.coerce.number().int().min(1),
});

type LineItem = { productType: "COURSE" | "TEXTBOOK"; productId: string; amount?: number };

async function fulfillOne(orderNo: string, userId: string, item: LineItem) {
  const startAt = new Date();

  if (item.productType === "COURSE") {
    const course = await prisma.course.findUnique({
      where: { id: item.productId },
      select: { enrollmentDays: true },
    });
    const days = course?.enrollmentDays ?? 365;
    const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: item.productId } },
      update: { status: "ACTIVE", startAt, endAt },
      create: { userId, courseId: item.productId, status: "ACTIVE", startAt, endAt },
    });
    return;
  }

  if (item.productType === "TEXTBOOK") {
    const textbook = await prisma.textbook.findUnique({
      where: { id: item.productId },
      select: { entitlementDays: true },
    });
    const days = textbook?.entitlementDays ?? 365;
    const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.textbookEntitlement.upsert({
      where: { userId_textbookId: { userId, textbookId: item.productId } },
      update: { status: "ACTIVE", startAt, endAt, orderNo },
      create: { userId, textbookId: item.productId, status: "ACTIVE", startAt, endAt, orderNo },
    });
  }
}

async function fulfillOrder(order: {
  orderNo: string;
  userId: string;
  productType: "COURSE" | "TEXTBOOK";
  courseId: string | null;
  textbookId: string | null;
  amount: number;
  providerPayload: unknown | null;
}) {
  // providerPayload.lineItems.items가 있으면 다중 상품 처리
  const raw = order.providerPayload as any;
  const items: LineItem[] | null = Array.isArray(raw?.lineItems?.items) ? raw.lineItems.items : null;
  if (items?.length) {
    for (const it of items) {
      if (!it?.productType || !it?.productId) continue;
      await fulfillOne(order.orderNo, order.userId, { productType: it.productType, productId: it.productId, amount: it.amount });
    }
    return;
  }

  // 하위 호환: 기존 단일 상품
  if (order.productType === "COURSE" && order.courseId) {
    await fulfillOne(order.orderNo, order.userId, { productType: "COURSE", productId: order.courseId });
    return;
  }
  if (order.productType === "TEXTBOOK" && order.textbookId) {
    await fulfillOne(order.orderNo, order.userId, { productType: "TEXTBOOK", productId: order.textbookId });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { paymentKey, orderId, amount } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNo: orderId },
    select: {
      id: true,
      orderNo: true,
      userId: true,
      productType: true,
      courseId: true,
      textbookId: true,
      amount: true,
      status: true,
      enrolled: true,
      providerPayload: true,
    },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
  }
  if (order.amount !== amount) {
    return NextResponse.json({ ok: false, error: "AMOUNT_MISMATCH" }, { status: 400 });
  }
  if (order.status === "COMPLETED") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  // Confirm payment with Toss server
  let secretKey: string;
  try {
    secretKey = getTossSecretKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOSS_SECRET_KEY_NOT_SET";
    // eslint-disable-next-line no-console
    console.error("[toss confirm] missing secret key", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[toss confirm] failed", res.status, json);
    const prev = (order as any).providerPayload ?? null;
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        provider: "toss",
        providerPaymentKey: paymentKey,
        // lineItems 등 기존 payload가 있다면 유지하면서 toss 응답을 병합
        providerPayload: prev && typeof prev === "object" ? { ...(prev as any), toss: json } : { toss: json },
      },
    });
    return NextResponse.json({ ok: false, error: "TOSS_CONFIRM_FAILED", details: json }, { status: 400 });
  }

  const prev = (order as any).providerPayload ?? null;
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "COMPLETED",
      paymentMethod: (json as any)?.method ?? "toss",
      provider: "toss",
      providerPaymentKey: paymentKey,
      // lineItems 등 기존 payload가 있다면 유지하면서 toss 응답을 병합
      providerPayload: prev && typeof prev === "object" ? { ...(prev as any), toss: json } : { toss: json },
      enrolled: true,
      enrolledAt: new Date(),
    },
  });

  if (!order.enrolled) {
    await fulfillOrder({
      orderNo: order.orderNo,
      userId: order.userId,
      productType: order.productType,
      courseId: order.courseId,
      textbookId: order.textbookId,
      amount: order.amount,
      providerPayload: (order as any).providerPayload ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}


