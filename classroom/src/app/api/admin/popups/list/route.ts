import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();
  const popups = await prisma.popup.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, popups });
}


