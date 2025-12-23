import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  title: z.string().min(1).optional(),
  imwebProdCode: z.string().optional().transform((v) => (v === "" ? null : v)),
  entitlementDays: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const referer = req.headers.get("referer") || "/admin/textbooks";

  const raw = await req.formData().catch(() => null);
  if (!raw) {
    return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  const parsed = Schema.safeParse({
    textbookId: raw.get("textbookId"),
    title: raw.get("title"),
    imwebProdCode: raw.get("imwebProdCode"),
    entitlementDays: raw.get("entitlementDays"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  const { textbookId, title, imwebProdCode, entitlementDays } = parsed.data;

  // 소유권 확인
  const existing = await prisma.textbook.findUnique({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
  }

  await prisma.textbook.update({
    where: { id: textbookId },
    data: {
      ...(title !== undefined && { title }),
      ...(imwebProdCode !== undefined && { imwebProdCode }),
      ...(entitlementDays !== undefined && { entitlementDays }),
    },
  });

  return NextResponse.redirect(new URL(`${referer}?saved=success`, req.url));
}

