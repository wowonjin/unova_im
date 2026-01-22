import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";
import { z } from "zod";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

async function ensureTeacherImageColumn() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Textbook" ADD COLUMN IF NOT EXISTS "teacherImageUrl" TEXT;');
  } catch {
    // ignore
  }
}

/**
 * POST /api/admin/textbooks/[textbookId]/teacher-image
 * 선생님 프로필 이미지 업로드 (data URL 저장)
 */
export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await requireAdminUser();
  const { textbookId } = ParamsSchema.parse(await ctx.params);

  // 교재 소유권 확인
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });

  if (!textbook || textbook.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "INVALID_CONTENT_TYPE" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("teacherImage");

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
  if ((file.size ?? 0) <= 0) return NextResponse.json({ ok: false, error: "EMPTY_FILE" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  const base64 = bytes.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  await ensureTeacherImageColumn();
  await prisma.textbook.update({
    where: { id: textbookId },
    data: { teacherImageUrl: dataUrl },
  });

  return NextResponse.json({ ok: true, teacherImageUrl: dataUrl });
}
