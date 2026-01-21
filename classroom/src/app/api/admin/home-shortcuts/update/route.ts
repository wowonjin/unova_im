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
  label: z.string().min(1).max(80).optional(),
  // data URL(base64)이나 긴 CDN URL도 허용하기 위해 넉넉하게 잡음
  imageUrl: z.string().min(1).max(MAX_URL_LEN).optional(),
  linkUrl: z.string().min(1).max(MAX_URL_LEN).optional(),
  schoolLogoUrl: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v.trim() || null)),
  bgColor: z.string().optional().transform((v) => (v == null ? undefined : v.trim() || null)),
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
    label: getFormString(form, "label"),
    imageUrl: getFormString(form, "imageUrl"),
    linkUrl: getFormString(form, "linkUrl"),
    schoolLogoUrl: getFormString(form, "schoolLogoUrl"),
    bgColor: getFormString(form, "bgColor"),
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
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.linkUrl !== undefined) data.linkUrl = parsed.data.linkUrl;
  if (parsed.data.schoolLogoUrl !== undefined) data.schoolLogoUrl = parsed.data.schoolLogoUrl;
  if (parsed.data.bgColor !== undefined) data.bgColor = parsed.data.bgColor;
  if (parsed.data.position !== undefined) data.position = parsed.data.position;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "HomeShortcut" ADD COLUMN IF NOT EXISTS "schoolLogoUrl" TEXT;'
    );
    const p = prisma as unknown as { homeShortcut: { update: Function } };
    const shortcut = await p.homeShortcut.update({
      where: { id: parsed.data.id },
      data,
    });
    // 홈은 ISR 캐시를 사용하므로, 관리자 변경 사항을 즉시 반영하기 위해 캐시를 무효화한다.
    revalidatePath("/");
    return NextResponse.json({ ok: true, shortcut });
  } catch (e) {
    console.error("[admin/home-shortcuts/update] failed:", e);
    const code = (e as any)?.code;
    if (code === "P2025") {
      // Record to update not found
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


