import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  title: z.string().min(1).max(200),
  imageUrl: z.string().min(1).max(2000),
  linkUrl: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
  position: z.enum(["center", "bottom-right"]).default("center"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function parseDateOnly(s?: string | null): Date | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  // YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function POST(req: Request) {
  await requireAdminUser();
  const form = await req.formData();
  const parsed = Schema.safeParse({
    title: form.get("title"),
    imageUrl: form.get("imageUrl"),
    linkUrl: form.get("linkUrl"),
    position: form.get("position"),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const startAt = parseDateOnly(parsed.data.startDate);
  const endAt = parseDateOnly(parsed.data.endDate);

  const popup = await prisma.popup.create({
    data: {
      title: parsed.data.title,
      imageUrl: parsed.data.imageUrl,
      linkUrl: parsed.data.linkUrl,
      position: parsed.data.position,
      isActive: true,
      startAt,
      endAt,
    },
  });

  return NextResponse.json({ ok: true, popup });
}


