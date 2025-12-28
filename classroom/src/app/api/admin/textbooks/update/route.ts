import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  title: z.string().min(1).optional(),
  teacherName: z.string().optional().transform((v) => v || null),
  subjectName: z.string().optional().transform((v) => v || null),
  entitlementDays: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
  composition: z.string().optional().transform((v) => (typeof v === "string" ? v.trim() : "") || null),
});

export async function POST(req: Request) {
  const teacher = await requireAdminUser();
  const contentType = req.headers.get("content-type") || "";
  const isFormData = contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded");
  const referer = req.headers.get("referer") || "/admin/textbooks";

  let raw: FormData | null = null;
  
  try {
    raw = await req.formData();
  } catch {
    if (isFormData) {
      return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = Schema.safeParse({
    textbookId: raw.get("textbookId"),
    title: raw.get("title"),
    teacherName: raw.get("teacherName"),
    subjectName: raw.get("subjectName"),
    entitlementDays: raw.get("entitlementDays"),
    composition: raw.get("composition"),
  });

  if (!parsed.success) {
    if (isFormData) {
      return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { textbookId, title, teacherName, subjectName, entitlementDays, composition } = parsed.data;

  // 소유권 확인
  const existing = await prisma.textbook.findUnique({
    where: { id: textbookId, ownerId: teacher.id },
    select: { id: true },
  });

  if (!existing) {
    if (isFormData) {
      return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        ...(title !== undefined && { title }),
        ...(teacherName !== undefined && { teacherName }),
        ...(subjectName !== undefined && { subjectName }),
        ...(entitlementDays !== undefined && { entitlementDays }),
        ...(composition !== undefined && { composition }),
      } as never,
    });
  } catch (e) {
    // 배포 환경에서 컬럼이 아직 없을 수 있음(마이그레이션 누락). composition 없이 재시도.
    console.error("[admin/textbooks/update] textbook.update failed, retrying without composition:", e);
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        ...(title !== undefined && { title }),
        ...(teacherName !== undefined && { teacherName }),
        ...(subjectName !== undefined && { subjectName }),
        ...(entitlementDays !== undefined && { entitlementDays }),
      } as never,
    });
  }

  // JSON 요청이면 JSON 응답, 아니면 redirect
  return NextResponse.json({ ok: true });
}

