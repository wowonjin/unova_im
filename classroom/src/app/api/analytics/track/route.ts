import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BodySchema = z.object({
  visitorId: z.string().min(1).max(200),
  path: z.string().min(1).max(2000),
  referrer: z.string().max(2000).optional().nullable(),
  userAgent: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { visitorId, path, referrer, userAgent } = parsed.data;

  // NOTE: 별도 테이블/마이그레이션 없이 기존 OrderEvent에 pageview 이벤트를 기록합니다.
  // provider/eventType만으로 필터링할 수 있어 분석에 충분합니다.
  await prisma.orderEvent.create({
    data: {
      provider: "web",
      eventType: "pageview",
      payload: {
        visitorId,
        path,
        referrer: referrer || null,
        userAgent: userAgent || null,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

