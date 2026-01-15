import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function buildLoginRedirect(req: Request, fallbackPath: string) {
  const referer = req.headers.get("referer");
  let redirectPath = fallbackPath;
  try {
    if (referer) {
      const u = new URL(referer);
      redirectPath = `${u.pathname}${u.search || ""}`;
    }
  } catch {
    // ignore
  }
  return `/login?error=unauthorized&redirect=${encodeURIComponent(redirectPath)}`;
}

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
        price: number | null;
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
        price: true,
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
        price: true,
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
  const isAdmin = Boolean(user?.isAdmin);
  if (!isAdmin && !tb.isPublished) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 아임웹 상품 매핑이 있으면 "구매자만" 다운로드 가능
  // NOTE: "판매 가격=0"인 교재는 무료로 간주하여 paywall을 해제합니다.
  const isPaywalled =
    tb.imwebProdCode != null && tb.imwebProdCode.length > 0 && !(typeof tb.price === "number" && tb.price === 0);

  // 비로그인 사용자는 paywall 교재 접근 불가(로그인 유도), 무료 교재는 허용
  if (!user && isPaywalled) {
    const redirect = buildLoginRedirect(req, "/materials");
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  if (!isAdmin && isPaywalled) {
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    const ok = await prisma.textbookEntitlement.findFirst({
      where: { userId: user.id, textbookId: tb.id, status: "ACTIVE", endAt: { gt: now } },
      select: { id: true },
    });
    if (!ok) {
      // 번들(상품) 구매로 포함된 교재(relatedTextbookIds)인 경우에도 접근 허용
      let hasBundleIncludedAccess = false;
      try {
        const parents = await prisma.textbookEntitlement.findMany({
          where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
          select: { textbookId: true },
        });
        const parentIds = parents.map((p) => p.textbookId);
        if (parentIds.length > 0) {
          try {
            const rows = await prisma.textbook.findMany({
              where: { id: { in: parentIds } },
              select: { relatedTextbookIds: true },
            });
            for (const r of rows as any[]) {
              const raw = r?.relatedTextbookIds;
              const ids = Array.isArray(raw) ? raw : null;
              if (ids && ids.includes(tb.id)) {
                hasBundleIncludedAccess = true;
                break;
              }
            }
          } catch {
            // 배포 환경에서 relatedTextbookIds 컬럼이 없을 수 있음 → 폴백: 부모별 raw 조회
            for (const pid of parentIds) {
              try {
                const rows = (await prisma.$queryRawUnsafe(
                  'SELECT "relatedTextbookIds" FROM "Textbook" WHERE "id" = $1',
                  pid
                )) as any[];
                const raw = rows?.[0]?.relatedTextbookIds;
                const ids = Array.isArray(raw) ? raw : null;
                if (ids && ids.includes(tb.id)) {
                  hasBundleIncludedAccess = true;
                  break;
                }
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore
      }
      if (hasBundleIncludedAccess) {
        // ok
      } else {
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


