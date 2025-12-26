import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
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
  return NextResponse.json({ ok: true, popups });
}


