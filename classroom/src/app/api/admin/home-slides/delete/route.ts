import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  await requireAdminUser();
  const form = await req.formData();
  const parsed = Schema.safeParse({ id: form.get("id") });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  try {
    const p = prisma as unknown as { homeSlide: { delete: Function } };
    await p.homeSlide.delete({ where: { id: parsed.data.id } });
    // 홈은 ISR 캐시를 사용하므로, 관리자 변경 사항을 즉시 반영하기 위해 캐시를 무효화한다.
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/home-slides/delete] failed:", e);
    return NextResponse.json({ ok: false, error: "DB_NOT_READY" }, { status: 500 });
  }
}


