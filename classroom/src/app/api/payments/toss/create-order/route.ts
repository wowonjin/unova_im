import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { generateTossOrderId, getTossClientKey, getTossPaymentClientKey } from "@/lib/toss";
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

  let clientKey: string; // 위젯/호환용
  let paymentClientKey: string;
  try {
    clientKey = getTossClientKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOSS_CLIENT_KEY_NOT_SET";
    // eslint-disable-next-line no-console
    console.error("[toss create-order] missing client key", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  try {
    paymentClientKey = getTossPaymentClientKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOSS_PAYMENT_CLIENT_KEY_NOT_SET";
    // eslint-disable-next-line no-console
    console.error("[toss create-order] missing payment client key", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

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
      const course = await prisma.course.findFirst({
        where: { id: item.productId, isPublished: true },
        select: { id: true, title: true, price: true },
      });
      if (!course) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      itemName = course.title;
      if (!Number.isFinite(course.price as any) || (course.price ?? 0) <= 0) {
        return NextResponse.json(
          { ok: false, error: "PRICE_NOT_SET", details: { productType: "COURSE", productId: item.productId } },
          { status: 400 }
        );
      }
      itemAmount = course.price!;
      if (item.option === "regular") itemAmount = Math.round(itemAmount * 0.8);
    } else {
      const textbook = await prisma.textbook.findFirst({
        where: { id: item.productId, isPublished: true },
        select: { id: true, title: true, price: true },
      });
      if (!textbook) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      itemName = textbook.title;
      if (!Number.isFinite(textbook.price as any) || (textbook.price ?? 0) <= 0) {
        return NextResponse.json(
          { ok: false, error: "PRICE_NOT_SET", details: { productType: "TEXTBOOK", productId: item.productId } },
          { status: 400 }
        );
      }
      itemAmount = textbook.price!;
    }

    totalAmount += itemAmount;
    productNames.push(itemName);
    orderItems.push({
      productType: item.productType,
      productId: item.productId,
      amount: itemAmount,
    });
  }

  const firstItem = cartItems[0];

  // 할인 정책
  // - 교재 할인: 선택 교재 1권당 5,000원, 최대 10,000원
  //   - 강의+교재 묶음: 선택한 교재 개수만큼 할인
  //   - 교재 상세(교재+추가교재): "추가 교재" 개수만큼 할인 (= 전체 교재 개수 - 1)
  // - 강의 할인: 강의+교재를 함께 구매할 경우 10,000원
  const hasCourse = cartItems.some((i) => i.productType === "COURSE");
  const textbookCount = cartItems.filter((i) => i.productType === "TEXTBOOK").length;

  const additionalTextbookCount = hasCourse
    ? textbookCount
    : firstItem?.productType === "TEXTBOOK"
      ? Math.max(0, textbookCount - 1)
      : 0;

  const additionalTextbookDiscount = Math.min(
    additionalTextbookCount * ADDITIONAL_TEXTBOOK_DISCOUNT_PER,
    ADDITIONAL_TEXTBOOK_DISCOUNT_MAX
  );

  const courseBundleDiscount = hasCourse && textbookCount > 0 ? 10000 : 0;

  // 할인 합이 결제 금액을 초과하면(특히 테스트/저가 상품) 총액이 0원이 되어 결제가 불가능해집니다.
  // 이 경우에는 할인 적용을 건너뛰어 결제 금액이 0원이 되지 않게 합니다.
  let cappedAdditionalTextbookDiscount = additionalTextbookDiscount;
  let cappedCourseBundleDiscount = courseBundleDiscount;

  let totalDiscount = cappedAdditionalTextbookDiscount + cappedCourseBundleDiscount;
  if (totalDiscount >= totalAmount) {
    cappedAdditionalTextbookDiscount = 0;
    cappedCourseBundleDiscount = 0;
    totalDiscount = 0;
  }

  totalAmount = Math.max(0, totalAmount - totalDiscount);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_AMOUNT",
        details: {
          totalAmount,
          totalDiscount,
          additionalTextbookDiscount: cappedAdditionalTextbookDiscount,
          courseBundleDiscount: cappedCourseBundleDiscount,
          cartItemsCount: cartItems.length,
        },
      },
      { status: 400 }
    );
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
      providerPayload: {
        lineItems: { items: orderItems },
        discounts: {
          additionalTextbookDiscount,
          courseBundleDiscount,
          totalDiscount,
        },
      },
    },
  });

  // Toss will redirect browser to these URLs after payment attempt
  const successUrl = `${baseUrl}/payments/toss/success`;
  const failUrl = `${baseUrl}/payments/toss/fail`;

  return NextResponse.json({
    ok: true,
    clientKey,
    paymentClientKey,
    // 결제위젯(customerKey)은 유추가 어려운 고유 값이어야 합니다.
    // 이 프로젝트에서는 사용자 PK가 충분히 무작위(cuid 등)라 가정하고 그대로 사용합니다.
    customerKey: user.id,
    order: {
      orderId,
      orderName,
      amount: totalAmount,
      successUrl,
      failUrl,
    },
  });
}


