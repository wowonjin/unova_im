import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  await requireAdminUser();
  const form = await req.formData();
  const parsed = Schema.safeParse({ id: form.get("id") });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  await prisma.popup.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}


