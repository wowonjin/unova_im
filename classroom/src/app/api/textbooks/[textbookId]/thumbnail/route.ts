import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ParamsSchema = z.object({ textbookId: z.string().min(1) });

function cacheControlForThumbnailRequest(req: Request): string {
  // 페이지에서 /thumbnail?v=... 형태로 캐시 버스팅을 붙이므로
  // v가 있으면 장기 캐시(immutable)로도 안전합니다.
  try {
    const u = new URL(req.url);
    const v = u.searchParams.get("v");
    if (v && v.trim()) return "public, max-age=31536000, immutable";
  } catch {
    // ignore
  }
  // v가 없으면 교체 가능성을 고려해 짧게
  return "public, max-age=300";
}

export async function GET(req: Request, ctx: { params: Promise<{ textbookId: string }> }) {
  const { textbookId } = ParamsSchema.parse(await ctx.params);
  const cacheControl = cacheControlForThumbnailRequest(req);

  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, thumbnailUrl: true },
  });
  if (!textbook) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // data URL인 경우: Base64 디코딩하여 이미지 반환
  if (textbook.thumbnailUrl && textbook.thumbnailUrl.startsWith("data:")) {
    const match = textbook.thumbnailUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      const headers = new Headers();
      headers.set("content-type", mimeType);
      headers.set("content-length", String(buffer.length));
      headers.set("cache-control", cacheControl);

      return new NextResponse(buffer, { status: 200, headers });
    }
  }

  // 일반 URL인 경우: 리다이렉트
  if (textbook.thumbnailUrl) {
    const res = NextResponse.redirect(textbook.thumbnailUrl);
    res.headers.set("cache-control", cacheControl);
    return res;
  }

  // 없으면 플레이스홀더로
  const placeholder = new URL("/course-placeholder.svg", req.url);
  const res = NextResponse.redirect(placeholder);
  res.headers.set("cache-control", cacheControl);
  return res;
}

