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
  return undefined; // null or File -> undefined (zod에서 required면 INVALID_REQUEST로 잡힘)
}

const Schema = z.object({
  label: z.string().min(1).max(80),
  // data URL(base64)이나 긴 CDN URL도 허용하기 위해 넉넉하게 잡음
  imageUrl: z.string().min(1).max(MAX_URL_LEN),
  linkUrl: z.string().min(1).max(MAX_URL_LEN),
  schoolLogoUrl: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
  bgColor: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
  openInNewTab: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      const s = v.toLowerCase().trim();
      if (s === "1" || s === "true" || s === "on") return true;
      if (s === "0" || s === "false" || s === "off") return false;
      return undefined;
    }),
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
    label: getFormString(form, "label"),
    imageUrl: getFormString(form, "imageUrl"),
    linkUrl: getFormString(form, "linkUrl"),
    schoolLogoUrl: getFormString(form, "schoolLogoUrl"),
    bgColor: getFormString(form, "bgColor"),
    openInNewTab: getFormString(form, "openInNewTab"),
    position: getFormString(form, "position"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const openInNewTab = parsed.data.openInNewTab;

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "HomeShortcut" ADD COLUMN IF NOT EXISTS "schoolLogoUrl" TEXT;'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "HomeShortcut" ADD COLUMN IF NOT EXISTS "openInNewTab" BOOLEAN DEFAULT true;'
    );
    const p = prisma as unknown as { homeShortcut: { create: Function } };
    const shortcut = await p.homeShortcut.create({
      data: {
        label: parsed.data.label,
        imageUrl: parsed.data.imageUrl,
        linkUrl: parsed.data.linkUrl,
        schoolLogoUrl: parsed.data.schoolLogoUrl,
        bgColor: parsed.data.bgColor,
        position: parsed.data.position,
        isActive: true,
      },
    });
    if (openInNewTab === false) {
      await prisma.$executeRaw`
        UPDATE "HomeShortcut"
        SET "openInNewTab" = false, "updatedAt" = NOW()
        WHERE "id" = ${shortcut.id};
      `;
    }
    // 홈은 ISR 캐시를 사용하므로, 관리자 변경 사항을 즉시 반영하기 위해 캐시를 무효화한다.
    revalidatePath("/");
    return NextResponse.json({ ok: true, shortcut });
  } catch (e) {
    console.error("[admin/home-shortcuts/create] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


