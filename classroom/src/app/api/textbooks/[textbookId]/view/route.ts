import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

export async function GET(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const user = await requireCurrentUser();
  const { textbookId } = ParamsSchema.parse(await ctx.params);
  const now = new Date();

  const tb = await prisma.textbook.findUnique({
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
  if (!tb) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 관리자(교사)는 항상 접근 가능, 수강생은 공개된 교재만
  if (!user.isAdmin && !tb.isPublished) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 아임웹 상품 매핑이 있으면 "구매자만" 접근 가능
  const isPaywalled = tb.imwebProdCode != null && tb.imwebProdCode.length > 0;
  if (!user.isAdmin && isPaywalled) {
    const ok = await prisma.textbookEntitlement.findFirst({
      where: { userId: user.id, textbookId: tb.id, status: "ACTIVE", endAt: { gt: now } },
      select: { id: true },
    });
    if (!ok) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("cache-control", "public, max-age=3600");
  headers.set("content-disposition", `inline; filename="${encodeURIComponent(tb.originalName || tb.title)}"`);

  // 외부 URL(GCS 등): 서버가 fetch 해서 same-origin으로 전달 → pdf.js CORS 문제 회피
  if (isHttpUrl(tb.storedPath)) {
    const upstream = await fetch(tb.storedPath, {
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

    headers.set("content-type", upstream.headers.get("content-type") || tb.mimeType || "application/pdf");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("content-length", len);

    return new NextResponse(upstream.body, { status: 200, headers });
  }

  // 로컬 파일
  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), tb.storedPath);
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  headers.set("content-type", tb.mimeType || "application/pdf");
  headers.set("content-length", String(stat.size));

  return new NextResponse(webStream, { status: 200, headers });
}


