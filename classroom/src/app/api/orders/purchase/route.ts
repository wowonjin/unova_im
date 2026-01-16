import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";

export const runtime = "nodejs";

const Schema = z.object({
  productType: z.enum(["COURSE", "TEXTBOOK"]),
  productId: z.string().min(1),
  paymentMethod: z.string().optional(),
});

function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await ensureSoldOutColumnsOnce();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const { productType, productId, paymentMethod } = parsed.data;

  // Get product information
  let productName = "";
  let amount = 0;
  let enrollmentDays = 365;

  if (productType === "COURSE") {
    const course = await prisma.course.findUnique({
      where: { id: productId, isPublished: true },
      select: { id: true, title: true, price: true, enrollmentDays: true, isSoldOut: true },
    });

    if (!course) {
      return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }
    if ((course as any).isSoldOut) {
      return NextResponse.json({ ok: false, error: "SOLD_OUT" }, { status: 409 });
    }

    productName = course.title;
    amount = course.price || 0;
    enrollmentDays = course.enrollmentDays;
  } else {
    const textbook = await prisma.textbook.findUnique({
      where: { id: productId, isPublished: true },
      select: { id: true, title: true, price: true, entitlementDays: true, isSoldOut: true },
    });

    if (!textbook) {
      return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }
    if ((textbook as any).isSoldOut) {
      return NextResponse.json({ ok: false, error: "SOLD_OUT" }, { status: 409 });
    }

    productName = textbook.title;
    amount = textbook.price || 0;
    enrollmentDays = textbook.entitlementDays;
  }

  const orderNo = generateOrderNo();

  // Create order
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      productType,
      courseId: productType === "COURSE" ? productId : null,
      textbookId: productType === "TEXTBOOK" ? productId : null,
      orderNo,
      productName,
      amount,
      status: "COMPLETED", // In a real app, this would be PENDING until payment is confirmed
      paymentMethod: paymentMethod || "카드",
      enrolled: true,
      enrolledAt: new Date(),
    },
  });

  // Auto-enroll the user
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + enrollmentDays * 24 * 60 * 60 * 1000);

  if (productType === "COURSE") {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: productId } },
      update: { status: "ACTIVE", startAt, endAt },
      create: { userId: user.id, courseId: productId, status: "ACTIVE", startAt, endAt },
    });
  } else {
    await prisma.textbookEntitlement.upsert({
      where: { userId_textbookId: { userId: user.id, textbookId: productId } },
      update: { status: "ACTIVE", startAt, endAt, orderNo },
      create: { userId: user.id, textbookId: productId, status: "ACTIVE", startAt, endAt, orderNo },
    });
  }

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      orderNo: order.orderNo,
      productName: order.productName,
      amount: order.amount,
      status: order.status,
    },
  });
}

