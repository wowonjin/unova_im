import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { syncImwebOrderToEnrollments } from "@/lib/imweb";

export const runtime = "nodejs";

const Schema = z.object({ orderNo: z.string().min(1).transform((s) => s.trim()) });

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const form = await req.formData();
  const orderNo = typeof form.get("orderNo") === "string" ? (form.get("orderNo") as string) : "";
  const parsed = Schema.safeParse({ orderNo });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const result = await syncImwebOrderToEnrollments(parsed.data.orderNo);
  console.log("[IMWEB] sync-order", parsed.data.orderNo, result);

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


