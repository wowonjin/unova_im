import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  sourceTextbookIds: z.array(z.string().min(1)).min(1),
});

type FileItem = {
  storedPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
};

export async function POST(req: Request) {
  const teacher = await requireAdminUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const { textbookId, sourceTextbookIds } = parsed.data;

  // target ownership
  const target = await prisma.textbook.findFirst({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 여러 source 교재에서 파일 정보 수집
  const allFiles: FileItem[] = [];

  for (const sourceId of sourceTextbookIds) {
    if (sourceId === textbookId) continue;

    let source:
      | {
          id: string;
          ownerId: string;
          storedPath: string;
          originalName: string;
          mimeType: string;
          sizeBytes: number;
          pageCount?: number | null;
          files?: unknown;
        }
      | null = null;

    try {
      source = await prisma.textbook.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          ownerId: true,
          storedPath: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          pageCount: true,
          files: true,
        },
      });
    } catch {
      source = await prisma.textbook.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          ownerId: true,
          storedPath: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          pageCount: true,
        },
      });
    }

    if (!source || source.ownerId !== teacher.id) continue;

    // "등록된 교재" 기준(구글 스토리지 URL) 검증
    const sp = (source.storedPath || "").toLowerCase();
    const isRegistered =
      sp.includes("storage.googleapis.com") || sp.includes("storage.cloud.google.com") || sp.startsWith("gs://");
    if (!isRegistered) continue;

    // files 배열이 있으면 그 내용을, 없으면 대표 파일만
    const sourceFiles = Array.isArray((source as any)?.files) ? ((source as any).files as any[]) : null;
    if (sourceFiles && sourceFiles.length > 0) {
      for (const f of sourceFiles) {
        if (!f || typeof f !== "object" || !f.storedPath) continue;
        allFiles.push({
          storedPath: f.storedPath,
          originalName: f.originalName || source.originalName,
          mimeType: f.mimeType || source.mimeType || "application/pdf",
          sizeBytes: Number(f.sizeBytes) || 0,
          pageCount: Number(f.pageCount) || null,
        });
      }
    } else {
      allFiles.push({
        storedPath: source.storedPath,
        originalName: source.originalName,
        mimeType: source.mimeType || "application/pdf",
        sizeBytes: source.sizeBytes || 0,
        pageCount: (source as any).pageCount ?? null,
      });
    }
  }

  if (allFiles.length === 0) {
    return NextResponse.json({ ok: false, error: "NO_VALID_SOURCE" }, { status: 400 });
  }

  const primaryFile = allFiles[0]!;

  const updateData: Record<string, unknown> = {
    storedPath: primaryFile.storedPath,
    originalName: primaryFile.originalName,
    mimeType: primaryFile.mimeType,
    sizeBytes: primaryFile.sizeBytes,
    pageCount: primaryFile.pageCount,
  };

  // files 컬럼에 전체 파일 목록 저장
  try {
    updateData.files = allFiles;
    await prisma.textbook.update({ where: { id: textbookId }, data: updateData as any, select: { id: true } });
  } catch {
    // files 컬럼 누락 → 대표 파일만 저장
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        storedPath: primaryFile.storedPath,
        originalName: primaryFile.originalName,
        mimeType: primaryFile.mimeType,
        sizeBytes: primaryFile.sizeBytes,
        pageCount: primaryFile.pageCount,
      } as any,
      select: { id: true },
    });
  }

  return NextResponse.json({ ok: true, count: allFiles.length });
}
