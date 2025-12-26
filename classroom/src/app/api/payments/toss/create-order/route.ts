import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { generateTossOrderId, getTossClientKey } from "@/lib/toss";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

const Schema = z.object({
  productType: z.enum(["COURSE", "TEXTBOOK"]),
  productId: z.string().min(1),
  option: z.enum(["full", "regular"]).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { productType, productId, option } = parsed.data;
  const baseUrl = getBaseUrl(req);

  // Load product + determine amount
  let productName = "";
  let amount = 0;

  if (productType === "COURSE") {
    const course = await prisma.course.findUnique({
      where: { id: productId, isPublished: true },
      select: { id: true, title: true, price: true },
    });
    if (!course) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    productName = course.title;
    amount = course.price ?? 0;
    if (option === "regular") amount = Math.round(amount * 0.8);
  } else {
    const textbook = await prisma.textbook.findUnique({
      where: { id: productId, isPublished: true },
      select: { id: true, title: true, price: true },
    });
    if (!textbook) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    productName = textbook.title;
    amount = textbook.price ?? 0;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
  }

  const orderId = generateTossOrderId();

  await prisma.order.create({
    data: {
      userId: user.id,
      productType,
      courseId: productType === "COURSE" ? productId : null,
      textbookId: productType === "TEXTBOOK" ? productId : null,
      orderNo: orderId,
      productName,
      amount,
      status: "PENDING",
      provider: "toss",
      enrolled: false,
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
      orderName: productName,
      amount,
      successUrl,
      failUrl,
    },
  });
}


