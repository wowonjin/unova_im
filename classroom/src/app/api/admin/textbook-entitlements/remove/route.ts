import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  entitlementId: z.string().min(1),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const referer = req.headers.get("referer") || "/admin/textbooks";

  const raw = await req.formData().catch(() => null);
  if (!raw) {
    return NextResponse.redirect(new URL(`${referer}?entitle=error`, req.url));
  }

  const parsed = Schema.safeParse({
    entitlementId: raw.get("entitlementId"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`${referer}?entitle=error`, req.url));
  }

  const { entitlementId } = parsed.data;

  // 소유권 확인
  const entitlement = await prisma.textbookEntitlement.findUnique({
    where: { id: entitlementId },
    include: { textbook: { select: { ownerId: true } } },
  });

  if (!entitlement || entitlement.textbook.ownerId !== teacher.id) {
    return NextResponse.redirect(new URL(`${referer}?entitle=error`, req.url));
  }

  // 삭제
  await prisma.textbookEntitlement.delete({
    where: { id: entitlementId },
  });

  return NextResponse.redirect(new URL(`${referer}?entitle=removed`, req.url));
}

