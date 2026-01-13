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

function getRedirectTo(order: { productType: "COURSE" | "TEXTBOOK"; providerPayload: unknown | null }): "/dashboard" | "/materials" {
  const raw = order.providerPayload as any;
  const items: LineItem[] | null = Array.isArray(raw?.lineItems?.items) ? raw.lineItems.items : null;
  const hasCourse = items?.some((it) => it?.productType === "COURSE") || order.productType === "COURSE";
  return hasCourse ? "/dashboard" : "/materials";
}

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

    // 강좌 상품에 "포함된 교재"가 설정된 경우(relatedTextbookIds),
    // 강좌 구매(수강권)와 함께 해당 교재도 자료실에서 바로 보이도록 권한을 부여합니다.
    // NOTE: 운영 환경에서 relatedTextbookIds 컬럼/Prisma 타입 불일치가 있을 수 있어 raw SQL로 안전 처리합니다.
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedTextbookIds" JSONB;');
    } catch {
      // ignore
    }

    let includedTextbookIds: string[] = [];
    try {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT "relatedTextbookIds" FROM "Course" WHERE "id" = $1',
        item.productId
      )) as any[];
      const raw = rows?.[0]?.relatedTextbookIds;
      includedTextbookIds = Array.isArray(raw) ? raw.filter((x) => typeof x === "string" && x) : [];
    } catch {
      includedTextbookIds = [];
    }

    if (includedTextbookIds.length > 0) {
      for (const textbookId of includedTextbookIds) {
        try {
          const existing = await prisma.textbookEntitlement.findUnique({
            where: { userId_textbookId: { userId, textbookId } },
            select: { id: true, endAt: true },
          });
          if (!existing) {
            await prisma.textbookEntitlement.create({
              data: { userId, textbookId, status: "ACTIVE", startAt, endAt, orderNo },
              select: { id: true },
            });
          } else if (existing.endAt < endAt) {
            await prisma.textbookEntitlement.update({
              where: { userId_textbookId: { userId, textbookId } },
              data: { status: "ACTIVE", startAt, endAt, orderNo },
              select: { id: true },
            });
          } else {
            // 기존 권한이 더 길면 유지하되, status/orderNo만 보정
            await prisma.textbookEntitlement.update({
              where: { userId_textbookId: { userId, textbookId } },
              data: { status: "ACTIVE", orderNo },
              select: { id: true },
            });
          }
        } catch {
          // 일부 교재가 삭제/미존재/권한 테이블 제약 등으로 실패해도 전체 결제 확정은 막지 않음
          continue;
        }
      }
    }
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
    return NextResponse.json({ ok: true, alreadyConfirmed: true, redirectTo: getRedirectTo(order) });
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

  return NextResponse.json({ ok: true, redirectTo: getRedirectTo(order) });
}


