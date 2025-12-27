import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { generateTossOrderId, getTossClientKey } from "@/lib/toss";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

// 새로운 cartItems 방식 스키마
const CartItemSchema = z.object({
  productType: z.enum(["COURSE", "TEXTBOOK"]),
  productId: z.string().min(1),
  option: z.enum(["full", "regular"]).optional(),
});

const NewSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1),
});

// 기존 단일 상품 방식 스키마 (하위 호환성)
const LegacySchema = z.object({
  productType: z.enum(["COURSE", "TEXTBOOK"]),
  productId: z.string().min(1),
  option: z.enum(["full", "regular"]).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const baseUrl = getBaseUrl(req);

  // cartItems 방식인지 기존 방식인지 확인
  let cartItems: z.infer<typeof CartItemSchema>[] = [];
  
  const newParsed = NewSchema.safeParse(body);
  if (newParsed.success) {
    cartItems = newParsed.data.cartItems;
  } else {
    // 기존 방식으로 시도
    const legacyParsed = LegacySchema.safeParse(body);
    if (!legacyParsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    cartItems = [legacyParsed.data];
  }

  // 각 상품의 이름과 금액 계산
  let totalAmount = 0;
  const productNames: string[] = [];
  const orderItems: { productType: "COURSE" | "TEXTBOOK"; productId: string; amount: number }[] = [];

  for (const item of cartItems) {
    let itemAmount = 0;
    let itemName = "";

    if (item.productType === "COURSE") {
      const course = await prisma.course.findUnique({
        where: { id: item.productId, isPublished: true },
        select: { id: true, title: true, price: true },
      });
      if (!course) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      itemName = course.title;
      itemAmount = course.price ?? 0;
      if (item.option === "regular") itemAmount = Math.round(itemAmount * 0.8);
    } else {
      const textbook = await prisma.textbook.findUnique({
        where: { id: item.productId, isPublished: true },
        select: { id: true, title: true, price: true },
      });
      if (!textbook) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      itemName = textbook.title;
      itemAmount = textbook.price ?? 0;
    }

    totalAmount += itemAmount;
    productNames.push(itemName);
    orderItems.push({
      productType: item.productType,
      productId: item.productId,
      amount: itemAmount,
    });
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
  }

  // 주문명 생성 (첫 번째 상품 외 N건)
  const orderName = productNames.length === 1 
    ? productNames[0] 
    : `${productNames[0]} 외 ${productNames.length - 1}건`;

  const orderId = generateTossOrderId();

  // 첫 번째 상품 기준으로 Order 생성 (다중 상품은 메타데이터로 저장)
  const firstItem = cartItems[0];
  await prisma.order.create({
    data: {
      userId: user.id,
      productType: firstItem.productType,
      courseId: firstItem.productType === "COURSE" ? firstItem.productId : null,
      textbookId: firstItem.productType === "TEXTBOOK" ? firstItem.productId : null,
      orderNo: orderId,
      productName: orderName,
      amount: totalAmount,
      status: "PENDING",
      provider: "toss",
      enrolled: false,
      // 다중 상품 정보를 JSON으로 저장
      metadata: cartItems.length > 1 ? JSON.stringify({ items: orderItems }) : null,
    },
  });

  // Toss will redirect browser to these URLs after payment attempt
  const successUrl = `${baseUrl}/payments/toss/success`;
  const failUrl = `${baseUrl}/payments/toss/fail`;

  return NextResponse.json({
    ok: true,
    clientKey: getTossClientKey(),
    order: {
      orderId,
      orderName,
      amount: totalAmount,
      successUrl,
      failUrl,
    },
  });
}


