import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 이미지 업로드
export async function POST(req: Request) {
  const teacher = await requireAdminUser();

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const textbookId = formData.get("textbookId") as string | null;
  const imageFile = formData.get("image") as File | null;

  if (!textbookId || !imageFile) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  // 교재 소유권 확인
  const textbook = await prisma.textbook.findFirst({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true },
  });
  if (!textbook) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 이미지를 base64 data URL로 변환
  const buffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = imageFile.type || "image/png";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // DB 업데이트
  await prisma.textbook.update({
    where: { id: textbookId },
    data: { teacherImageUrl: dataUrl } as any,
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

// 이미지 삭제
export async function DELETE(req: Request) {
  const teacher = await requireAdminUser();

  let body: { textbookId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const { textbookId } = body;
  if (!textbookId) {
    return NextResponse.json({ ok: false, error: "MISSING_TEXTBOOK_ID" }, { status: 400 });
  }

  // 교재 소유권 확인
  const textbook = await prisma.textbook.findFirst({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true },
  });
  if (!textbook) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // DB 업데이트
  await prisma.textbook.update({
    where: { id: textbookId },
    data: { teacherImageUrl: null } as any,
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
