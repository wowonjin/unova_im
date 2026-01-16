import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  try {
    const incoming = parsed.data.courseIds;

    const existing = await prisma.course.findMany({
      where: { ownerId: teacher.id },
      select: { id: true, position: true, updatedAt: true, createdAt: true },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    });
    if (existing.length === 0) return NextResponse.json({ ok: true });

    const existingIds = new Set(existing.map((c) => c.id));
    const uniqueIncoming: string[] = [];
    const seen = new Set<string>();
    for (const id of incoming) {
      if (!existingIds.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      uniqueIncoming.push(id);
    }

    // final order = incoming order + any missing courses appended (keep their current order)
    const finalOrder = [
      ...uniqueIncoming,
      ...existing.map((c) => c.id).filter((id) => !seen.has(id)),
    ];

    const maxPos = existing.reduce((acc, c) => Math.max(acc, c.position ?? 0), 0);
    const offset = Math.max(1000, maxPos + 1000);

    // 1) bump positions > 0 up to avoid UNIQUE(ownerId, position) collisions.
    // IMPORTANT: legacy rows may have position=0 for many records; bumping all rows would turn them
    // into the same positive value and violate the unique index. So we only bump rows where position > 0.
    await prisma.course.updateMany({
      where: { ownerId: teacher.id, position: { gt: 0 } },
      data: { position: { increment: offset } },
    });

    // 2) set final positions (ascending so it matches /admin/courses orderBy position asc)
    await prisma.$transaction(
      finalOrder.map((id, idx) =>
        prisma.course.update({
          where: { id },
          data: { position: idx + 1 },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/courses/reorder] failed:", e);
    return NextResponse.json({ ok: false, error: "FAILED" }, { status: 500 });
  }
}

