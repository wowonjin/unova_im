import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  imageUrl: z.string().min(1).max(2000),
  linkUrl: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
  tag: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
  titleHtml: z.string().min(1).max(4000),
  subtitle: z.string().optional().transform((v) => (v && v.trim().length ? v.trim() : null)),
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
    imageUrl: form.get("imageUrl"),
    linkUrl: form.get("linkUrl"),
    tag: form.get("tag"),
    titleHtml: form.get("titleHtml"),
    subtitle: form.get("subtitle"),
    position: form.get("position"),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  try {
    const p = prisma as unknown as { homeSlide: { create: Function } };
    const slide = await p.homeSlide.create({
      data: {
        imageUrl: parsed.data.imageUrl,
        linkUrl: parsed.data.linkUrl,
        tag: parsed.data.tag,
        titleHtml: parsed.data.titleHtml,
        subtitle: parsed.data.subtitle,
        position: parsed.data.position,
        isActive: true,
      },
    });
    // 홈은 ISR 캐시를 사용하므로, 관리자 변경 사항을 즉시 반영하기 위해 캐시를 무효화한다.
    revalidatePath("/");
    return NextResponse.json({ ok: true, slide });
  } catch (e) {
    console.error("[admin/home-slides/create] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


