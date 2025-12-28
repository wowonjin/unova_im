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

  try {
    const p = prisma as unknown as { homeSlide: { delete: Function } };
    await p.homeSlide.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/home-slides/delete] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


