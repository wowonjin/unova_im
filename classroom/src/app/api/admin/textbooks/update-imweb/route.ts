import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  imwebProdCode: z
    .string()
    .optional()
    .transform((s) => (s ? s.trim() : ""))
    .transform((s) => (s.length ? s : null)),
  entitlementDays: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (v >= 1 && v <= 3650), { message: "entitlementDays out of range" }),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const raw = {
    textbookId: form.get("textbookId"),
    imwebProdCode: form.get("imwebProdCode"),
    entitlementDays: form.get("entitlementDays"),
  };

  const parsed = Schema.safeParse({
    textbookId: typeof raw.textbookId === "string" ? raw.textbookId : "",
    imwebProdCode: typeof raw.imwebProdCode === "string" ? raw.imwebProdCode : undefined,
    entitlementDays: typeof raw.entitlementDays === "string" ? raw.entitlementDays : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const tb = await prisma.textbook.findUnique({
    where: { id: parsed.data.textbookId },
    select: { id: true, ownerId: true },
  });
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const updateData: Record<string, unknown> = {
    imwebProdCode: parsed.data.imwebProdCode,
  };

  // entitlementDays가 전달된 경우에만 업데이트
  if (parsed.data.entitlementDays !== undefined) {
    updateData.entitlementDays = parsed.data.entitlementDays;
  }

  await prisma.textbook.update({
    where: { id: tb.id },
    data: updateData,
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/textbooks", req.url));
}


