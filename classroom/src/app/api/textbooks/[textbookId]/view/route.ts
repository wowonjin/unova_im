import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
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

  // 다중 파일 지원: ?file= 인덱스로 선택, 없으면 기존 단일 파일(storedPath) 사용
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

  const isPaywalled = tb.imwebProdCode != null && tb.imwebProdCode.length > 0;
  const isAdmin = Boolean(user?.isAdmin);

  // 비관리자는 공개된 교재만
  if (!isAdmin && !tb.isPublished) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // paywall 교재: 관리자 외에는 entitlement 필요 (게스트는 접근 불가)
  if (!isAdmin && isPaywalled) {
    if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const ok = await prisma.textbookEntitlement.findFirst({
      where: { userId: user.id, textbookId: tb.id, status: "ACTIVE", endAt: { gt: now } },
      select: { id: true },
    });
    if (!ok) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const headers = new Headers();
  // private: 인증 기반 콘텐츠이므로 CDN에는 캐시 안 됨, 브라우저에만 캐시
  headers.set("cache-control", isAdmin || isPaywalled ? "private, max-age=86400, stale-while-revalidate=604800" : "public, max-age=86400");
  headers.set("vary", "Cookie");
  headers.set("content-disposition", `inline; filename="${encodeURIComponent(originalName || tb.title)}"`);

  // 외부 URL(GCS 등): 서버가 fetch 해서 same-origin으로 전달 → pdf.js CORS 문제 회피
  if (isHttpUrl(storedPath)) {
    const upstream = await fetch(storedPath, {
      // signed url 등도 따라가도록
      redirect: "follow",
      headers: {
        // 일부 스토리지는 UA에 따라 다르게 주는 케이스가 있어 기본값으로
        "user-agent": "unova-textbook-proxy",
      },
    }).catch(() => null);

    if (!upstream || !upstream.ok || !upstream.body) {
      return NextResponse.json({ ok: false, error: "UPSTREAM_FAILED" }, { status: 404 });
    }

    headers.set("content-type", upstream.headers.get("content-type") || mimeType || "application/pdf");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("content-length", len);

    return new NextResponse(upstream.body, { status: 200, headers });
  }

  // 로컬 파일
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

  headers.set("content-type", mimeType || "application/pdf");
  headers.set("content-length", String(stat.size));

  return new NextResponse(webStream, { status: 200, headers });
}


