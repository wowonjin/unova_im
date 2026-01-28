import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isMissingColumnError(e: unknown): boolean {
  return Boolean((e as any)?.code === "P2022");
}

const UpdateSchema = z.object({
  action: z.enum(["update", "delete"]),
  textbookIds: z.array(z.string().min(1)).min(1),
  update: z
    .object({
      title: z.string().min(1).optional(),
      price: z.number().nullable().optional(),
      originalPrice: z.number().nullable().optional(),
      teacherName: z.string().nullable().optional(),
      subjectName: z.string().nullable().optional(),
      entitlementDays: z.number().int().min(1).max(3650).optional(),
      isPublished: z.boolean().optional(),
      thumbnailUrl: z.string().nullable().optional(),
      gradeCategory: z.enum(["G1_2", "SUNEUNG", "TRANSFER"]).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { action, textbookIds, update } = parsed.data;

  if (action === "delete") {
    const res = await prisma.textbook.deleteMany({
      where: { id: { in: textbookIds }, ownerId: teacher.id },
    });
    return NextResponse.json({ ok: true, deleted: res.count });
  }

  if (!update || Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "EMPTY_UPDATE" }, { status: 400 });
  }

  const cleaned = Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined));
  if (Object.keys(cleaned).length === 0) {
    return NextResponse.json({ ok: false, error: "EMPTY_UPDATE" }, { status: 400 });
  }

  const variants: Array<Record<string, unknown>> = [cleaned];
  if ("gradeCategory" in cleaned) {
    const { gradeCategory: _omit, ...rest } = cleaned as Record<string, unknown>;
    variants.push(rest);
  }

  let lastErr: unknown = null;
  for (const data of variants) {
    if (!data || Object.keys(data).length === 0) continue;
    try {
      await prisma.textbook.updateMany({
        where: { id: { in: textbookIds }, ownerId: teacher.id },
        data: data as never,
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (!isMissingColumnError(e)) break;
    }
  }

  if (lastErr) {
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
