import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function parseFileIndex(req: Request): number | null {
  try {
    const u = new URL(req.url);
    const raw = u.searchParams.get("file");
    if (raw == null || raw.trim() === "") return null;
    if (!/^\d+$/.test(raw.trim())) return null;
    const n = parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    const redirect = `/login?error=unauthorized&redirect=${encodeURIComponent("/materials")}`;
    return NextResponse.redirect(new URL(redirect, req.url));
  }
  const { textbookId } = ParamsSchema.parse(await ctx.params);
  const now = new Date();

  const fileIndex = parseFileIndex(req);

  // NOTE: files 컬럼이 없는 환경(마이그레이션 미적용)일 수 있어 try/catch로 폴백
  let tb:
    | {
        id: string;
        ownerId: string;
        title: string;
        storedPath: string;
        originalName: string;
        mimeType: string;
        isPublished: boolean;
        imwebProdCode: string | null;
        files?: unknown;
      }
    | null = null;

  try {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        storedPath: true,
        originalName: true,
        mimeType: true,
        isPublished: true,
        imwebProdCode: true,
        files: true,
      },
    });
  } catch {
    tb = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        storedPath: true,
        originalName: true,
        mimeType: true,
        isPublished: true,
        imwebProdCode: true,
      },
    });
  }
  if (!tb) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let storedPath = tb.storedPath;
  let originalName = tb.originalName;
  let mimeType = tb.mimeType;
  const files = Array.isArray((tb as any).files) ? ((tb as any).files as any[]) : null;
  if (fileIndex != null && files && files.length > 0) {
    const f = files[fileIndex];
    if (!f || typeof f !== "object") return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (typeof f.storedPath === "string" && f.storedPath) storedPath = f.storedPath;
    if (typeof f.originalName === "string" && f.originalName) originalName = f.originalName;
    if (typeof f.mimeType === "string" && f.mimeType) mimeType = f.mimeType;
  }

  // 관리자(교사)는 항상 다운로드 가능, 수강생은 공개된 교재만
  if (!user.isAdmin && !tb.isPublished) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 아임웹 상품 매핑이 있으면 "구매자만" 다운로드 가능
  const isPaywalled = tb.imwebProdCode != null && tb.imwebProdCode.length > 0;
  if (!user.isAdmin && isPaywalled) {
    const ok = await prisma.textbookEntitlement.findFirst({
      where: { userId: user.id, textbookId: tb.id, status: "ACTIVE", endAt: { gt: now } },
      select: { id: true },
    });
    if (!ok) {
      // 강좌 구매로 포함된 교재(relatedTextbookIds)인 경우에도 접근 허용
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
        select: { courseId: true },
      });
      if (!enrollments.length) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

      try {
        await prisma.$executeRawUnsafe('ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "relatedTextbookIds" JSONB;');
      } catch {
        // ignore
      }

      let hasIncludedAccess = false;
      for (const e of enrollments) {
        try {
          const rows = (await prisma.$queryRawUnsafe(
            'SELECT "relatedTextbookIds" FROM "Course" WHERE "id" = $1',
            e.courseId
          )) as any[];
          const raw = rows?.[0]?.relatedTextbookIds;
          const ids = Array.isArray(raw) ? raw : null;
          if (ids && ids.includes(tb.id)) {
            hasIncludedAccess = true;
            break;
          }
        } catch {
          // ignore
        }
      }

      if (!hasIncludedAccess) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }
  }

  // 외부 URL(구글 콘솔 업로드)인 경우 그대로 리다이렉트
  if (/^https?:\/\//i.test(storedPath)) {
    return NextResponse.redirect(storedPath);
  }

  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), storedPath);
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers();
  headers.set("content-type", mimeType || "application/octet-stream");
  headers.set("content-length", String(stat.size));
  headers.set("content-disposition", `attachment; filename="${encodeURIComponent(originalName || tb.title)}"`);

  return new NextResponse(webStream, { status: 200, headers });
}


