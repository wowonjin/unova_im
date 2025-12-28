import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();
  try {
    const p = prisma as unknown as { homeShortcut: { findMany: Function } };
    const shortcuts = await p.homeShortcut.findMany({
      orderBy: [{ position: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ ok: true, shortcuts });
  } catch (e) {
    console.error("[admin/home-shortcuts/list] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" });
  }
}


