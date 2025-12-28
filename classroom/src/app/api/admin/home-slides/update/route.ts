import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1).max(2000).optional(),
  linkUrl: z.string().optional().transform((v) => (v == null ? undefined : v.trim() || null)),
  tag: z.string().optional().transform((v) => (v == null ? undefined : v.trim() || null)),
  titleHtml: z.string().min(1).max(4000).optional(),
  subtitle: z.string().optional().transform((v) => (v == null ? undefined : v.trim() || null)),
  position: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      const n = parseInt(String(v).trim(), 10);
      return Number.isFinite(n) ? n : undefined;
    }),
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
});

export async function POST(req: Request) {
  await requireAdminUser();
  const form = await req.formData();
  const parsed = Schema.safeParse({
    id: form.get("id"),
    imageUrl: form.get("imageUrl"),
    linkUrl: form.get("linkUrl"),
    tag: form.get("tag"),
    titleHtml: form.get("titleHtml"),
    subtitle: form.get("subtitle"),
    position: form.get("position"),
    isActive: form.get("isActive"),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.linkUrl !== undefined) data.linkUrl = parsed.data.linkUrl;
  if (parsed.data.tag !== undefined) data.tag = parsed.data.tag;
  if (parsed.data.titleHtml !== undefined) data.titleHtml = parsed.data.titleHtml;
  if (parsed.data.subtitle !== undefined) data.subtitle = parsed.data.subtitle;
  if (parsed.data.position !== undefined) data.position = parsed.data.position;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  try {
    const p = prisma as unknown as { homeSlide: { update: Function } };
    const slide = await p.homeSlide.update({
      where: { id: parsed.data.id },
      data,
    });
    return NextResponse.json({ ok: true, slide });
  } catch (e) {
    console.error("[admin/home-slides/update] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


