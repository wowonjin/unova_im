import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getTossClientKey } from "@/lib/toss";
import { getBaseUrl } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { orderId } = await ctx.params;
  if (!orderId) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { orderNo: orderId },
    select: {
      orderNo: true,
      userId: true,
      productName: true,
      amount: true,
      status: true,
      provider: true,
    },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
  }
  if (order.provider !== "toss") {
    return NextResponse.json({ ok: false, error: "NOT_TOSS_ORDER" }, { status: 400 });
  }

  const req = _req;
  const baseUrl = getBaseUrl(req);
  const successUrl = `${baseUrl}/payments/toss/success`;
  const failUrl = `${baseUrl}/payments/toss/fail`;

  let clientKey: string;
  try {
    clientKey = getTossClientKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOSS_CLIENT_KEY_NOT_SET";
    // eslint-disable-next-line no-console
    console.error("[toss order] missing client key", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    clientKey,
    customerKey: user.id,
    order: {
      orderId: order.orderNo,
      orderName: order.productName,
      amount: order.amount,
      successUrl,
      failUrl,
    },
  });
}


