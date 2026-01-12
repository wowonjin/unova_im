import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type PopupPayload = {
  ok: true;
  popups: Array<{
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string | null;
    position: string;
  }>;
};

let cache: { payload: PopupPayload; expiresAt: number } | null = null;

export async function GET() {
  const nowMs = Date.now();
  if (cache && cache.expiresAt > nowMs) {
    const res = NextResponse.json(cache.payload);
    res.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
    return res;
  }

  const now = new Date();
  const popups = await prisma.popup.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      title: true,
      imageUrl: true,
      linkUrl: true,
      position: true,
    },
  });

  const payload: PopupPayload = { ok: true, popups };
  cache = { payload, expiresAt: nowMs + 60_000 };

  const res = NextResponse.json(payload);
  res.headers.set("cache-control", "public, max-age=60, stale-while-revalidate=300");
  return res;
}


