import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  imageUrl: z.string().min(1).max(2000).optional(),
  linkUrl: z.string().optional().transform((v) => (v == null ? undefined : v.trim() || null)),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      const s = v.toLowerCase().trim();
      if (s === "1" || s === "true" || s === "on") return true;
      if (s === "0" || s === "false" || s === "off") return false;
      return undefined;
    }),
  position: z.enum(["center", "bottom-right"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function parseDateOnly(s?: string | null): Date | null | undefined {
  if (s == null) return undefined;
  const t = String(s).trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function POST(req: Request) {
  await requireAdminUser();
  const form = await req.formData();
  const parsed = Schema.safeParse({
    id: form.get("id"),
    title: form.get("title"),
    imageUrl: form.get("imageUrl"),
    linkUrl: form.get("linkUrl"),
    isActive: form.get("isActive"),
    position: form.get("position"),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.linkUrl !== undefined) data.linkUrl = parsed.data.linkUrl;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.position !== undefined) data.position = parsed.data.position;
  const startAt = parseDateOnly(parsed.data.startDate);
  const endAt = parseDateOnly(parsed.data.endDate);
  if (startAt !== undefined) data.startAt = startAt;
  if (endAt !== undefined) data.endAt = endAt;

  const popup = await prisma.popup.update({
    where: { id: parsed.data.id },
    data,
  });

  return NextResponse.json({ ok: true, popup });
}


