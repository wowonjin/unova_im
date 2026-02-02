import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { getTossBillingClientKey } from "@/lib/toss";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();
  try {
    const clientKey = getTossBillingClientKey();
    return NextResponse.json({ ok: true, clientKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOSS_BILLING_CLIENT_KEY_NOT_SET";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
