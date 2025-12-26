import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser, getCurrentUser } from "@/lib/current-user";
import { getStorageRoot, safeJoin } from "@/lib/storage";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ courseId: z.string().min(1) });

export async function GET(req: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const { courseId } = ParamsSchema.parse(await ctx.params);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, ownerId: true, thumbnailStoredPath: true, thumbnailMimeType: true, thumbnailUrl: true },
  });
  if (!course) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // thumbnailUrl이 data URL인 경우: Base64 디코딩하여 이미지 반환 (인증 불필요)
  if (course.thumbnailUrl && course.thumbnailUrl.startsWith("data:")) {
    const match = course.thumbnailUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      const headers = new Headers();
      headers.set("content-type", mimeType);
      headers.set("content-length", String(buffer.length));
      headers.set("cache-control", "public, max-age=31536000, immutable"); // 1년 캐시

      return new NextResponse(buffer, { status: 200, headers });
    }
  }

  // thumbnailUrl이 일반 URL인 경우: 리다이렉트 (인증 불필요)
  if (course.thumbnailUrl) {
    const res = NextResponse.redirect(course.thumbnailUrl);
    res.headers.set("cache-control", "private, max-age=60");
    return res;
  }

  // thumbnailStoredPath가 있는 경우: 로컬 파일 제공 (보호 필요)
  if (!course.thumbnailStoredPath) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  // 교사(소유자)는 수강권 없이도 썸네일 미리보기 가능
  const teacher = await getCurrentTeacherUser();
  if (teacher && course.ownerId && teacher.id === course.ownerId) {
    // ok
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    if (!user.isAdmin && !bypassEnrollment) {
      const now = new Date();
      const ok = await prisma.enrollment.findFirst({
        where: { userId: user.id, courseId, status: "ACTIVE", endAt: { gt: now } },
        select: { id: true },
      });
      if (!ok) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }
  }

  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), course.thumbnailStoredPath);
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers();
  headers.set("content-type", course.thumbnailMimeType || "application/octet-stream");
  headers.set("content-length", String(stat.size));
  headers.set("cache-control", "private, max-age=60");

  return new NextResponse(webStream, { status: 200, headers });
}


