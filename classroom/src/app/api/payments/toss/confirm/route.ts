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

async function fulfillOrder(order: { orderNo: string; userId: string; productType: "COURSE" | "TEXTBOOK"; courseId: string | null; textbookId: string | null; amount: number }) {
  const startAt = new Date();

  if (order.productType === "COURSE" && order.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: order.courseId },
      select: { enrollmentDays: true },
    });
    const days = course?.enrollmentDays ?? 365;
    const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
      update: { status: "ACTIVE", startAt, endAt },
      create: { userId: order.userId, courseId: order.courseId, status: "ACTIVE", startAt, endAt },
    });
    return;
  }

  if (order.productType === "TEXTBOOK" && order.textbookId) {
    const textbook = await prisma.textbook.findUnique({
      where: { id: order.textbookId },
      select: { entitlementDays: true },
    });
    const days = textbook?.entitlementDays ?? 365;
    const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.textbookEntitlement.upsert({
      where: { userId_textbookId: { userId: order.userId, textbookId: order.textbookId } },
      update: { status: "ACTIVE", startAt, endAt, orderNo: order.orderNo },
      create: { userId: order.userId, textbookId: order.textbookId, status: "ACTIVE", startAt, endAt, orderNo: order.orderNo },
    });
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
  const secretKey = getTossSecretKey();
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
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        provider: "toss",
        providerPaymentKey: paymentKey,
        providerPayload: json,
      },
    });
    return NextResponse.json({ ok: false, error: "TOSS_CONFIRM_FAILED", details: json }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "COMPLETED",
      paymentMethod: (json as any)?.method ?? "toss",
      provider: "toss",
      providerPaymentKey: paymentKey,
      providerPayload: json,
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
    });
  }

  return NextResponse.json({ ok: true });
}


