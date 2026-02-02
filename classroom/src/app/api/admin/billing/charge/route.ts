import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { basicAuthHeader, getTossBillingSecretKey, generateTossOrderId } from "@/lib/toss";

export const runtime = "nodejs";

const Schema = z.object({
  billingKey: z.string().min(1),
  customerKey: z.string().min(1),
  amount: z.coerce.number().int().min(1),
  orderName: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  await requireAdminUser();

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  let secretKey: string;
  try {
    secretKey = getTossBillingSecretKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOSS_BILLING_SECRET_KEY_NOT_SET";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const { billingKey, customerKey, amount, orderName } = parsed.data;
  const orderId = generateTossOrderId();

  const res = await fetch(`https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey,
      amount,
      orderId,
      orderName,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "BILLING_CHARGE_FAILED", details: json }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    orderId,
    paymentKey: (json as any)?.paymentKey ?? null,
    approvedAt: (json as any)?.approvedAt ?? null,
    raw: json,
  });
}
