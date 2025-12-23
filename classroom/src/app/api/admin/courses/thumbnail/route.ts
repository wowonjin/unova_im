import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
});

// 최대 파일 크기 제한 (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return req.headers.get("x-unova-client") === "1" || accept.includes("application/json");
}

export async function POST(req: Request) {
  const json = wantsJson(req);
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: typeof form.get("courseId") === "string" ? form.get("courseId") : "",
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const file = form.get("thumbnail");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
  if ((file.size ?? 0) <= 0) return NextResponse.json({ ok: false, error: "EMPTY_FILE" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });
  if (!course) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });
  if (course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  // 이미지를 Base64 데이터 URL로 변환하여 DB에 저장
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  const base64 = bytes.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  await prisma.course.update({
    where: { id: course.id },
    data: {
      thumbnailUrl: dataUrl,
      // 로컬 파일 저장 관련 필드는 초기화
      thumbnailStoredPath: null,
      thumbnailOriginalName: file.name || null,
      thumbnailMimeType: mimeType,
      thumbnailSizeBytes: bytes.length,
    },
  });

  const redirectTo = new URL(req.headers.get("referer") || `/admin/course/${course.id}?tab=settings`, req.url);
  redirectTo.searchParams.set("tab", "settings");
  redirectTo.searchParams.set("thumb", "saved");
  if (json) return NextResponse.json({ ok: true, redirectTo: redirectTo.toString() });
  return NextResponse.redirect(redirectTo);
}


