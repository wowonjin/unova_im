import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  title: z.string().min(1).optional(),
  subjectName: z.string().optional().transform((v) => v || null),
  entitlementDays: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
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
    subjectName: raw.get("subjectName"),
    entitlementDays: raw.get("entitlementDays"),
  });

  if (!parsed.success) {
    if (isFormData) {
      return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { textbookId, title, subjectName, entitlementDays } = parsed.data;

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

  await prisma.textbook.update({
    where: { id: textbookId },
    data: {
      ...(title !== undefined && { title }),
      ...(subjectName !== undefined && { subjectName }),
      ...(entitlementDays !== undefined && { entitlementDays }),
    },
  });

  // JSON 요청이면 JSON 응답, 아니면 redirect
  return NextResponse.json({ ok: true });
}

