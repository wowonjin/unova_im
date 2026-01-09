import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const MAX_URL_LEN = 10000;

const Schema = z.object({
  label: z.string().min(1).max(80),
  // data URL(base64)이나 긴 CDN URL도 허용하기 위해 넉넉하게 잡음
  imageUrl: z.string().min(1).max(MAX_URL_LEN),
  linkUrl: z.string().min(1).max(MAX_URL_LEN),
  bgColor: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
  position: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null) return 0;
      const n = parseInt(String(v).trim(), 10);
      return Number.isFinite(n) ? n : 0;
    }),
});

export async function POST(req: Request) {
  await requireAdminUser();
  const form = await req.formData();
  const parsed = Schema.safeParse({
    label: form.get("label"),
    imageUrl: form.get("imageUrl"),
    linkUrl: form.get("linkUrl"),
    bgColor: form.get("bgColor"),
    position: form.get("position"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const p = prisma as unknown as { homeShortcut: { create: Function } };
    const shortcut = await p.homeShortcut.create({
      data: {
        label: parsed.data.label,
        imageUrl: parsed.data.imageUrl,
        linkUrl: parsed.data.linkUrl,
        bgColor: parsed.data.bgColor,
        position: parsed.data.position,
        isActive: true,
      },
    });
    return NextResponse.json({ ok: true, shortcut });
  } catch (e) {
    console.error("[admin/home-shortcuts/create] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


