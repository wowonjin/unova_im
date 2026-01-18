import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();

    const body = (await req.json().catch(() => null)) as { teacherIds?: string[] } | null;
    const teacherIds = Array.isArray(body?.teacherIds) ? body!.teacherIds : null;
    if (!teacherIds || teacherIds.length === 0) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const normalized = teacherIds.map((id) => String(id || "").trim()).filter(Boolean);
    if (normalized.length === 0) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }

    const unique = new Set(normalized);
    if (unique.size !== normalized.length) {
      return NextResponse.json({ ok: false, error: "DUPLICATED_IDS" }, { status: 400 });
    }

    const existing = await prisma.teacher.findMany({
      select: { id: true, position: true, createdAt: true },
    });
    const existingIdSet = new Set(existing.map((t) => t.id));

    const missingFromDb = normalized.filter((id) => !existingIdSet.has(id));
    if (missingFromDb.length > 0) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", ids: missingFromDb }, { status: 400 });
    }

    // 누락된 선생님이 생겨도 순서가 유실되지 않도록:
    // 전달된 순서 + (누락된 선생님은 기존 정렬(=position, createdAt) 기준으로 뒤에 추가)
    const provided = unique;
    const missing = existing
      .filter((t) => !provided.has(t.id))
      .slice()
      .sort((a, b) => {
        const ap = (a.position ?? 0) === 0 ? Number.MAX_SAFE_INTEGER : (a.position ?? 0);
        const bp = (b.position ?? 0) === 0 ? Number.MAX_SAFE_INTEGER : (b.position ?? 0);
        if (ap !== bp) return ap - bp;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((t) => t.id);

    const finalOrder = [...normalized, ...missing];

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        finalOrder.map((id, idx) =>
          tx.teacher.update({
            where: { id },
            data: { position: idx + 1 },
          })
        )
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[admin/teachers/reorder] failed:", e);
    return NextResponse.json({ ok: false, error: "FAILED" }, { status: 500 });
  }
}

