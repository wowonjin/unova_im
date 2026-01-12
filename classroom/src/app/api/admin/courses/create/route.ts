import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";

const Schema = z.object({
  title: z.string().min(1).max(200),
  teacherName: z
    .string()
    .optional()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .refine((s) => s.length <= 80, { message: "teacherName too long" }),
  subjectName: z
    .string()
    .optional()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .refine((s) => s.length <= 80, { message: "subjectName too long" }),
  description: z.string().optional().transform((s) => (typeof s === "string" ? s.trim() : "")),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
  enrollmentDays: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || !/^\d+$/.test(v.trim())) return 365;
      return Math.max(1, Math.min(3650, parseInt(v.trim(), 10)));
    }),
});

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return req.headers.get("x-unova-client") === "1" || accept.includes("application/json");
}

// 최대 파일 크기 제한 (2MB) - Render 멀티 인스턴스/재배포 환경에서도 썸네일이 깨지지 않도록 DB(data URL) 저장 전략을 사용
const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function ensureUniqueSlug(base: string) {
  const cleanBase = slugify(base) || "course";
  let attempt = cleanBase;
  for (let i = 0; i < 50; i++) {
    const exists = await prisma.course.findUnique({ where: { slug: attempt }, select: { id: true } });
    if (!exists) return attempt;
    attempt = `${cleanBase}-${i + 2}`;
  }
  // fallback (극단 케이스)
  return `${cleanBase}-${Date.now()}`;
}

export async function POST(req: Request) {
  const json = wantsJson(req);
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const raw = {
    title: form.get("title"),
    teacherName: form.get("teacherName"),
    subjectName: form.get("subjectName"),
    description: form.get("description"),
    isPublished: form.get("isPublished"),
    thumbnail: form.get("thumbnail"),
  };

  const enrollmentDaysRaw = form.get("enrollmentDays");
  
  const parsed = Schema.safeParse({
    title: typeof raw.title === "string" ? raw.title : "",
    teacherName: typeof raw.teacherName === "string" ? raw.teacherName : undefined,
    subjectName: typeof raw.subjectName === "string" ? raw.subjectName : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    isPublished: typeof raw.isPublished === "string" ? raw.isPublished : undefined,
    enrollmentDays: typeof enrollmentDaysRaw === "string" ? enrollmentDaysRaw : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const title = parsed.data.title.trim();
  const slug = await ensureUniqueSlug(title);

  const last = await prisma.course.findFirst({
    where: { ownerId: teacher.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = Math.max(0, last?.position ?? 0) + 1;

  const course = await prisma.course.create({
    data: {
      ownerId: teacher.id,
      title,
      teacherName: parsed.data.teacherName?.length ? parsed.data.teacherName : null,
      subjectName: parsed.data.subjectName?.length ? parsed.data.subjectName : null,
      position,
      slug,
      description: parsed.data.description?.length ? parsed.data.description : null,
      thumbnailUrl: null,
      isPublished: parsed.data.isPublished,
      enrollmentDays: parsed.data.enrollmentDays,
    },
    select: { id: true, slug: true },
  });

  // 썸네일 파일(선택)
  const thumbnailFile =
    raw.thumbnail instanceof File && (raw.thumbnail.size ?? 0) > 0 && (raw.thumbnail.name ?? "").trim().length
      ? raw.thumbnail
      : null;

  if (thumbnailFile) {
    try {
      if (thumbnailFile.size > MAX_FILE_SIZE) {
        // 강좌 생성 자체는 성공시키되, 너무 큰 썸네일은 저장하지 않음
        console.warn("[admin/courses/create] thumbnail too large, skipped:", {
          courseId: course.id,
          size: thumbnailFile.size,
          name: thumbnailFile.name,
        });
      } else {
        // 이미지를 Base64 데이터 URL로 변환하여 DB에 저장 (멀티 인스턴스에서도 안정적으로 표시)
        const bytes = Buffer.from(await thumbnailFile.arrayBuffer());
        const mimeType = thumbnailFile.type || "image/jpeg";
        const base64 = bytes.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64}`;

        await prisma.course.update({
          where: { id: course.id },
          data: {
            thumbnailUrl: dataUrl,
            // 로컬 파일 저장 관련 필드는 사용하지 않음 (기존 값이 있더라도 정리)
            thumbnailStoredPath: null,
            thumbnailOriginalName: thumbnailFile.name || null,
            thumbnailMimeType: mimeType,
            thumbnailSizeBytes: bytes.length,
          },
        });
      }
    } catch (e) {
      console.error("[admin/courses/create] failed to persist thumbnail:", e);
    }
  }

  const redirectTo = `/admin/course/${course.id}`;
  if (json) return NextResponse.json({ ok: true, courseId: course.id, redirectTo });
  return NextResponse.redirect(new URL(redirectTo, req.url));
}


