import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  teacherName: z.string().optional().default("").transform((s) => s.trim()),
  // 기본은 "이미 이미지가 있으면 덮어쓰지 않음"
  force: z
    .string()
    .optional()
    .default("0")
    .transform((v) => v === "1" || v.toLowerCase() === "true"),
});

function normalizeTeacherNameKey(input: string): string {
  return (input ?? "")
    .replace(/선생님/g, "")
    .replace(/\bT\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const admin = await requireAdminUser();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const parsed = Schema.safeParse({
    textbookId: typeof form.get("textbookId") === "string" ? form.get("textbookId") : "",
    teacherName: typeof form.get("teacherName") === "string" ? form.get("teacherName") : "",
    force: typeof form.get("force") === "string" ? form.get("force") : "0",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });

  const { textbookId, teacherName, force } = parsed.data;
  const teacherNameKey = normalizeTeacherNameKey(teacherName);

  // 소유권 + 현재 값 확인
  const textbook = await prisma.textbook.findFirst({
    where: { id: textbookId, ownerId: admin.id },
    select: { id: true, teacherImageUrl: true },
  });
  if (!textbook) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const existing = (textbook as { teacherImageUrl?: string | null }).teacherImageUrl ?? null;
  if (!force && (existing ?? "").trim().length > 0) {
    return NextResponse.json({ ok: true, skipped: true, teacherImageUrl: existing });
  }

  if (!teacherNameKey) {
    return NextResponse.json({ ok: true, teacherImageUrl: null });
  }

  // Teachers 테이블에서 이름으로 매칭 (스토어와 동일한 방식: equals 우선, contains 폴백)
  const t = await prisma.teacher.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: teacherNameKey, mode: "insensitive" } },
        { name: { contains: teacherNameKey, mode: "insensitive" } },
      ],
    },
    select: { imageUrl: true, mainImageUrl: true },
  });

  const resolved = (t?.imageUrl || t?.mainImageUrl || null) as string | null;
  if (!resolved) {
    return NextResponse.json({ ok: true, teacherImageUrl: null });
  }

  try {
    // 운영/로컬 스키마 드리프트에 대비: 컬럼이 없으면 추가 후 업데이트
    await prisma.$executeRawUnsafe('ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherImageUrl" TEXT;');
    await prisma.$executeRawUnsafe('UPDATE "Textbook" SET "teacherImageUrl" = $1 WHERE "id" = $2', resolved, textbookId);
  } catch (e: any) {
    console.error("[api/admin/textbooks/resolve-teacher-image] failed:", { textbookId, teacherNameKey, resolved, code: e?.code, message: e?.message });
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teacherImageUrl: resolved });
}

