import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getFileSizeFromUrl(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    }
  } catch (e) {
    console.error("[getFileSizeFromUrl] Failed to get file size:", e);
  }
  return 0;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ textbookId: string }> }
) {
  const teacher = await requireAdminUser();
  const { textbookId } = await params;

  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true, storedPath: true, sizeBytes: true },
  });

  if (!textbook) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 이미 파일 크기가 있으면 스킵
  if (textbook.sizeBytes > 0) {
    return NextResponse.json({ ok: true, sizeBytes: textbook.sizeBytes, skipped: true });
  }

  // URL인 경우에만 파일 크기 가져오기
  if (!textbook.storedPath.startsWith("http")) {
    return NextResponse.json({ ok: true, sizeBytes: 0, skipped: true });
  }

  const sizeBytes = await getFileSizeFromUrl(textbook.storedPath);

  if (sizeBytes > 0) {
    await prisma.textbook.update({
      where: { id: textbookId },
      data: { sizeBytes },
    });
  }

  return NextResponse.json({ ok: true, sizeBytes });
}

