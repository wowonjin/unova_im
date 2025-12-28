import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();
  try {
    const p = prisma as unknown as { homeSlide: { findMany: Function } };
    const slides = await p.homeSlide.findMany({
      orderBy: [{ position: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ ok: true, slides });
  } catch (e) {
    console.error("[admin/home-slides/list] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" });
  }
}


