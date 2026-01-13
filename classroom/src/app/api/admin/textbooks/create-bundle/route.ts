import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  sourceTextbookIds: z.array(z.string().min(1)).min(2),
  title: z.string().min(1),
  price: z.number().int().min(0),
  originalPrice: z.number().int().min(0).nullable().optional(),
  teacherName: z.string().min(1).nullable().optional(),
  subjectName: z.string().min(1).nullable().optional(),
  entitlementDays: z.number().int().min(1).max(3650),
  isPublished: z.boolean(),
});

type FileItem = {
  storedPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
};

function normalizeGcsUrl(s: string): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (t.toLowerCase().startsWith("gs://")) {
    return `https://storage.googleapis.com/${t.slice(5)}`;
  }
  return t;
}

function isRegisteredExternalUrl(url: string): boolean {
  const u = (url || "").toLowerCase();
  return (
    u.includes("storage.googleapis.com") ||
    u.includes("storage.cloud.google.com") ||
    u.startsWith("gs://") ||
    u.startsWith("https://") ||
    u.startsWith("http://")
  );
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const {
    sourceTextbookIds,
    title,
    price,
    originalPrice,
    teacherName: teacherNameInput,
    subjectName: subjectNameInput,
    entitlementDays,
    isPublished,
  } = parsed.data;

  const safeOriginalPrice = originalPrice != null && originalPrice < price ? null : originalPrice ?? null;

  // position: admin 목록에서 드래그&드롭 정렬을 위한 값 (내림차순 정렬)
  const last = await prisma.textbook
    .findFirst({
      where: { ownerId: teacher.id },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    .catch(() => null);
  const basePosition = Math.max(0, (last as { position?: number } | null)?.position ?? 0) + 1;

  // 소스 교재 로드(소유권 확인)
  // NOTE: 환경에 따라 files 컬럼 유무가 달라 Prisma 타입 추론이 꼬일 수 있어,
  // 이 라우트에서는 필요한 필드만 런타임에서 안전하게 다루도록 any로 받습니다. (빌드 실패 방지)
  let sources: any[] = [];

  try {
    sources = (await prisma.textbook.findMany({
      where: { id: { in: sourceTextbookIds }, ownerId: teacher.id },
      select: {
        id: true,
        ownerId: true,
        storedPath: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        pageCount: true,
        files: true,
        thumbnailUrl: true,
        teacherName: true,
        subjectName: true,
      },
    })) as any[];
  } catch {
    // files 컬럼이 없는 환경 폴백
    sources = (await prisma.textbook.findMany({
      where: { id: { in: sourceTextbookIds }, ownerId: teacher.id },
      select: {
        id: true,
        ownerId: true,
        storedPath: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        pageCount: true,
        thumbnailUrl: true,
        teacherName: true,
        subjectName: true,
      },
    } as any)) as any[];
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  for (const id of sourceTextbookIds) {
    if (!sourceMap.has(id)) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }
  }

  // 파일 수집(입력 순서대로)
  const allFiles: FileItem[] = [];
  for (const id of sourceTextbookIds) {
    const src = sourceMap.get(id)!;

    const sp = normalizeGcsUrl(src.storedPath);
    if (!isRegisteredExternalUrl(sp)) continue;

    const sourceFiles = Array.isArray((src as any)?.files) ? ((src as any).files as any[]) : null;
    if (sourceFiles && sourceFiles.length > 0) {
      for (const f of sourceFiles) {
        if (!f || typeof f !== "object") continue;
        const storedPath = normalizeGcsUrl(typeof f.storedPath === "string" ? f.storedPath : "");
        if (!storedPath) continue;
        if (!isRegisteredExternalUrl(storedPath)) continue;
        allFiles.push({
          storedPath,
          originalName:
            (typeof f.originalName === "string" && f.originalName) ? f.originalName : src.originalName,
          mimeType:
            (typeof f.mimeType === "string" && f.mimeType) ? f.mimeType : (src.mimeType || "application/pdf"),
          sizeBytes: Number(f.sizeBytes) || 0,
          pageCount: Number(f.pageCount) > 0 ? Number(f.pageCount) : null,
        });
      }
    } else {
      allFiles.push({
        storedPath: sp,
        originalName: src.originalName,
        mimeType: src.mimeType || "application/pdf",
        sizeBytes: src.sizeBytes || 0,
        pageCount: src.pageCount ?? null,
      });
    }
  }

  if (allFiles.length === 0) {
    return NextResponse.json({ ok: false, error: "NO_VALID_SOURCE" }, { status: 400 });
  }

  const primary = allFiles[0]!;
  const firstSource = sourceMap.get(sourceTextbookIds[0]!)!;

  const nextTeacherName = teacherNameInput ?? firstSource.teacherName ?? null;
  const nextSubjectName = subjectNameInput ?? firstSource.subjectName ?? null;

  const data: Record<string, unknown> = {
    ownerId: teacher.id,
    position: basePosition,
    title,
    teacherName: nextTeacherName,
    subjectName: nextSubjectName,
    storedPath: primary.storedPath,
    originalName: primary.originalName,
    mimeType: primary.mimeType,
    sizeBytes: primary.sizeBytes,
    pageCount: primary.pageCount,
    // 대표 썸네일은 첫 소스 교재를 재사용(필요 시 상세 설정에서 변경 가능)
    thumbnailUrl: firstSource.thumbnailUrl,
    entitlementDays,
    isPublished,
    price,
    originalPrice: safeOriginalPrice,
    composition: `${sourceTextbookIds.length}권 세트`,
  };

  let createdId: string | null = null;
  try {
    // files 컬럼이 있는 환경
    (data as any).files = allFiles;
    const created = await prisma.textbook.create({
      data: data as never,
      select: { id: true },
    });
    createdId = created.id;
  } catch (e) {
    console.error("[admin/textbooks/create-bundle] textbook.create failed, retrying without files:", e);
    // files 컬럼이 없는 환경 폴백(대표 파일만 생성)
    const created = await prisma.textbook.create({
      data: data as never,
      select: { id: true },
    });
    createdId = created.id;
  }

  return NextResponse.json({ ok: true, textbookId: createdId, fileCount: allFiles.length });
}

