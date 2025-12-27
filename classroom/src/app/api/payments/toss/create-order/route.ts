import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { generateTossOrderId, getTossClientKey } from "@/lib/toss";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

const ADDITIONAL_TEXTBOOK_DISCOUNT_PER = 5000;
const ADDITIONAL_TEXTBOOK_DISCOUNT_MAX = 10000;

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

  // "추가 교재 구매" 할인: 교재를 한 권 고를 때마다 5,000원, 최대 10,000원
  // (교재 상세의 메인 교재 + 선택한 추가 교재들 시나리오를 기준으로, 추가 교재 개수만큼 할인)
  const firstItem = cartItems[0];
  const additionalTextbookCount =
    firstItem?.productType === "TEXTBOOK"
      ? Math.max(0, cartItems.filter((i) => i.productType === "TEXTBOOK").length - 1)
      : 0;
  const additionalDiscount = Math.min(
    additionalTextbookCount * ADDITIONAL_TEXTBOOK_DISCOUNT_PER,
    ADDITIONAL_TEXTBOOK_DISCOUNT_MAX
  );
  totalAmount = Math.max(0, totalAmount - additionalDiscount);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
  }

  // 주문명 생성 (첫 번째 상품 외 N건)
  const orderName = productNames.length === 1 
    ? productNames[0] 
    : `${productNames[0]} 외 ${productNames.length - 1}건`;

  const orderId = generateTossOrderId();

  // 첫 번째 상품 기준으로 Order 생성
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
      // 다중 상품 정보를 providerPayload에 저장해둠(컬럼 추가 없이 사용)
      // confirm 단계에서 toss 응답과 병합 저장합니다.
      providerPayload: { lineItems: { items: orderItems }, discounts: { additionalTextbookDiscount: additionalDiscount } },
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


