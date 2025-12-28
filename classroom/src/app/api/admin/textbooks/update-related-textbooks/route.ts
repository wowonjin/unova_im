import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  relatedTextbookIds: z.string().optional().transform((s) => {
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData();
  const data: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") data[key] = value;
  }

  const parsed = Schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const { textbookId, relatedTextbookIds } = parsed.data;

  // Verify ownership
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });

  if (!textbook || textbook.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    await prisma.textbook.update({
      where: { id: textbookId },
      data: { relatedTextbookIds } as never,
    });
  } catch (e) {
    // 배포 환경에서 컬럼이 아직 없을 수 있음(마이그레이션 누락)
    console.error("[admin/textbooks/update-related-textbooks] textbook.update failed:", e);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


