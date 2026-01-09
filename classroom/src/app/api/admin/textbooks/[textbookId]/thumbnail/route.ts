import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { z } from "zod";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });
const BodySchema = z.object({
  thumbnailDataUrl: z.string().min(1).max(500_000), // ~375KB base64 limit
});

// 최대 파일 크기 제한 (2MB) - 강좌 썸네일과 동일
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * POST /api/admin/textbooks/[textbookId]/thumbnail
 * 클라이언트에서 생성한 썸네일 data URL을 저장
 */
export async function POST(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

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

  // 1) 이미지 파일 업로드(multipart/form-data)
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("thumbnail");

    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    if ((file.size ?? 0) <= 0) return NextResponse.json({ ok: false, error: "EMPTY_FILE" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";
    const base64 = bytes.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    await prisma.textbook.update({
      where: { id: textbookId },
      data: { thumbnailUrl: dataUrl },
    });

    return NextResponse.json({ ok: true });
  }

  // 2) data URL 저장(JSON) - 기존 PDF 첫 페이지 썸네일 생성 로직용
  let body: { thumbnailDataUrl: string };
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  // 썸네일 저장
  await prisma.textbook.update({
    where: { id: textbookId },
    data: { thumbnailUrl: body.thumbnailDataUrl },
  });

  return NextResponse.json({ ok: true });
}

