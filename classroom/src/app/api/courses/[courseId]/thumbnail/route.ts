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

// 최대 파일 크기 제한 (2MB) - 로컬 파일 썸네일을 DB(data URL)로 자동 마이그레이션할 때 사용
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return req.headers.get("x-unova-client") === "1" || accept.includes("application/json");
}

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

function redirectPlaceholder(req: Request) {
  // public asset
  const res = NextResponse.redirect(new URL("/course-placeholder.svg", req.url));
  res.headers.set("cache-control", "public, max-age=300"); // 5분
  return res;
}

export async function GET(req: Request, ctx: { params: Promise<{ courseId: string }> }) {
  const json = wantsJson(req);
  const bypassEnrollment = isAllCoursesTestModeFromRequest(req);
  const { courseId } = ParamsSchema.parse(await ctx.params);
  const cacheControl = cacheControlForThumbnailRequest(req);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      ownerId: true,
      isPublished: true,
      thumbnailStoredPath: true,
      thumbnailMimeType: true,
      thumbnailUrl: true,
    },
  });
  if (!course) {
    return json ? NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 }) : redirectPlaceholder(req);
  }

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
      // NOTE:
      // data URL 기반 썸네일은 교체(재업로드)될 수 있는데,
      // URL(/api/courses/:id/thumbnail)이 고정이면 immutable 캐시 때문에 갱신이 영구적으로 안 될 수 있음.
      // 페이지(스토어/대시보드 등)에서 ?v=... 캐시 버스팅을 붙이더라도,
      // 여기서는 과도한 immutable 캐시를 피한다.
      headers.set("cache-control", cacheControl);

      return new NextResponse(buffer, { status: 200, headers });
    }
  }

  // thumbnailUrl이 일반 URL인 경우: 리다이렉트 (인증 불필요)
  if (course.thumbnailUrl) {
    const res = NextResponse.redirect(course.thumbnailUrl);
    res.headers.set("cache-control", cacheControl);
    return res;
  }

  // thumbnailStoredPath가 있는 경우: 로컬 파일 제공 (보호 필요)
  if (!course.thumbnailStoredPath) {
    return json ? NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 }) : redirectPlaceholder(req);
  }

  // 공개 판매(스토어 노출)된 강의의 썸네일은 마케팅/공유 목적상 인증 없이도 접근 가능해야 합니다.
  // (카카오톡/검색엔진 등의 OG 크롤러는 로그인 상태가 아니므로)
  const allowPublic = !!course.isPublished;

  // 교사(소유자)는 수강권 없이도 썸네일 미리보기 가능
  const teacher = await getCurrentTeacherUser();
  if (teacher && course.ownerId && teacher.id === course.ownerId) {
    // ok
  } else {
    const user = await getCurrentUser();
    if (!user) {
      if (!allowPublic) {
        return json
          ? NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })
          : redirectPlaceholder(req);
      }
    }

    if (user && !user.isAdmin && !bypassEnrollment && !allowPublic) {
      const now = new Date();
      const ok = await prisma.enrollment.findFirst({
        where: { userId: user.id, courseId, status: "ACTIVE", endAt: { gt: now } },
        select: { id: true },
      });
      if (!ok) {
        return json
          ? NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 })
          : redirectPlaceholder(req);
      }
    }
  }

  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), course.thumbnailStoredPath);
  } catch {
    return json ? NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 }) : redirectPlaceholder(req);
  }
  if (!fs.existsSync(filePath)) {
    return json ? NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 }) : redirectPlaceholder(req);
  }

  const stat = fs.statSync(filePath);
  const mimeType = course.thumbnailMimeType || "application/octet-stream";

  // 파일이 존재하는데 thumbnailUrl이 비어있다면(과거 storedPath 방식),
  // 멀티 인스턴스 환경에서도 깨지지 않도록 DB(data URL)로 1회 자동 마이그레이션을 시도한다.
  if (stat.size > 0 && stat.size <= MAX_FILE_SIZE) {
    try {
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      await prisma.course.update({
        where: { id: courseId },
        data: {
          thumbnailUrl: dataUrl,
          thumbnailStoredPath: null,
          thumbnailMimeType: mimeType,
          thumbnailSizeBytes: buffer.length,
        },
      });

      const headers = new Headers();
      headers.set("content-type", mimeType);
      headers.set("content-length", String(buffer.length));
      headers.set("cache-control", cacheControl);
      return new NextResponse(buffer, { status: 200, headers });
    } catch (e) {
      // 마이그레이션 실패해도, 기존 방식(스트리밍)으로 계속 제공
      console.error("[courses/thumbnail] migrate stored thumbnail to dataUrl failed:", e);
    }
  }

  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers();
  headers.set("content-type", mimeType);
  headers.set("content-length", String(stat.size));
  headers.set("cache-control", allowPublic ? cacheControl : "private, max-age=60");

  return new NextResponse(webStream, { status: 200, headers });
}


