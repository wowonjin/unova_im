import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import fs from "node:fs/promises";
import { getStorageRoot, safeJoin } from "@/lib/storage";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";

export const runtime = "nodejs";

const Schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    textbookIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    action: z.literal("update"),
    textbookIds: z.array(z.string().min(1)).min(1),
    update: z
      .object({
        title: z.string().min(1).optional(),
        price: z.number().int().min(0).nullable().optional(),
        originalPrice: z.number().int().min(0).nullable().optional(),
        teacherName: z.string().min(1).nullable().optional(),
        subjectName: z.string().min(1).nullable().optional(),
        // 판매 등록용(옵션): 전달된 경우에만 갱신
        isPublished: z.boolean().optional(),
        isSoldOut: z.boolean().optional(),
        imwebProdCode: z.string().min(1).nullable().optional(),
        entitlementDays: z.number().int().min(1).max(3650).optional(),
      })
      .strict(),
  }),
]);

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  await ensureSoldOutColumnsOnce();

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const ids = parsed.data.textbookIds;

  if (parsed.data.action === "delete") {
    // Fetch storedPath for file cleanup (best-effort)
    const rows = await prisma.textbook.findMany({
      where: { id: { in: ids }, ownerId: teacher.id },
      select: { id: true, storedPath: true },
    });

    const ownedIds = rows.map((r) => r.id);
    if (ownedIds.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

    const del = await prisma.textbook.deleteMany({
      where: { id: { in: ownedIds }, ownerId: teacher.id },
    });

    // Delete local files (skip external URLs)
    await Promise.all(
      rows.map(async (r) => {
        if (/^https?:\/\//i.test(r.storedPath)) return;
        try {
          const filePath = safeJoin(getStorageRoot(), r.storedPath);
          await fs.unlink(filePath);
        } catch {
          // ignore
        }
      })
    );

    return NextResponse.json({ ok: true, deleted: del.count });
  }

  // update
  const update = parsed.data.update;
  if (!update || Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "NO_UPDATE_FIELDS" }, { status: 400 });
  }

  // Prisma updateMany does not allow undefined keys; build data dynamically.
  const data: Record<string, unknown> = {};
  if ("title" in update) data.title = update.title;
  if ("price" in update) data.price = update.price;
  if ("originalPrice" in update) data.originalPrice = update.originalPrice;
  if ("teacherName" in update) data.teacherName = update.teacherName;
  if ("subjectName" in update) data.subjectName = update.subjectName;
  if ("isPublished" in update) data.isPublished = update.isPublished;
  if ("isSoldOut" in update) data.isSoldOut = update.isSoldOut;
  if ("imwebProdCode" in update) data.imwebProdCode = update.imwebProdCode;
  if ("entitlementDays" in update) data.entitlementDays = update.entitlementDays;

  const res = await prisma.textbook.updateMany({
    where: { id: { in: ids }, ownerId: teacher.id },
    data,
  });

  return NextResponse.json({ ok: true, updated: res.count });
}


