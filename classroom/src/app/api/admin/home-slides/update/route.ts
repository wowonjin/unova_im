import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const MAX_URL_LEN = 10000;

function getFormString(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  if (typeof v === "string") return v;
  return undefined; // null or File -> undefined
}

const Schema = z.object({
  id: z.string().min(1),
  // data URL(base64)이나 긴 CDN URL도 허용하기 위해 넉넉하게 잡음
  imageUrl: z.string().min(1).max(MAX_URL_LEN).optional(),
  linkUrl: z.string().max(MAX_URL_LEN).optional().transform((v) => (v == null ? undefined : v.trim() || null)),
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
    id: getFormString(form, "id"),
    imageUrl: getFormString(form, "imageUrl"),
    linkUrl: getFormString(form, "linkUrl"),
    tag: getFormString(form, "tag"),
    titleHtml: getFormString(form, "titleHtml"),
    subtitle: getFormString(form, "subtitle"),
    position: getFormString(form, "position"),
    isActive: getFormString(form, "isActive"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST", issues: parsed.error.issues },
      { status: 400 }
    );
  }

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
    // 홈은 ISR 캐시를 사용하므로, 관리자 변경 사항을 즉시 반영하기 위해 캐시를 무효화한다.
    revalidatePath("/");
    return NextResponse.json({ ok: true, slide });
  } catch (e) {
    console.error("[admin/home-slides/update] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


