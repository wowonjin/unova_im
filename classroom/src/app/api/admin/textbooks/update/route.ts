import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isMissingColumnError(e: unknown): boolean {
  // Prisma P2022: column does not exist
  return Boolean((e as any)?.code === "P2022");
}

const Schema = z.object({
  textbookId: z.string().min(1),
  title: z.string().min(1).optional(),
  teacherName: z.string().optional().transform((v) => v || null),
  // Admin UI에서 "ISBN"으로 입력받지만, 현재 DB 스키마에는 ISBN 전용 컬럼이 없어
  // Textbook.imwebProdCode에 저장해서 사용합니다.
  isbn: z.string().optional().transform((v) => (typeof v === "string" ? v.trim() : "") || null),
  subjectName: z.string().optional().transform((v) => v || null),
  entitlementDays: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
  gradeCategory: z
    .enum(["G1_2", "SUNEUNG", "TRANSFER"])
    .optional()
    .transform((v) => v || undefined),
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
    isbn: raw.get("isbn"),
    subjectName: raw.get("subjectName"),
    entitlementDays: raw.get("entitlementDays"),
    gradeCategory: raw.get("gradeCategory"),
    composition: raw.get("composition"),
  });

  if (!parsed.success) {
    if (isFormData) {
      return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { textbookId, title, teacherName, isbn, subjectName, entitlementDays, gradeCategory, composition } = parsed.data;

  // 소유권 확인
  const existing = await prisma.textbook.findFirst({
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
    const dataFull: Record<string, unknown> = {
      ...(title !== undefined && { title }),
      ...(teacherName !== undefined && { teacherName }),
      ...(isbn !== undefined && { imwebProdCode: isbn }),
      ...(subjectName !== undefined && { subjectName }),
      ...(entitlementDays !== undefined && { entitlementDays }),
      ...(gradeCategory !== undefined && { gradeCategory }),
      ...(composition !== undefined && { composition }),
    };

    const attempts: Array<{ label: string; data: Record<string, unknown> }> = [
      { label: "full", data: dataFull },
      // composition 컬럼이 없을 수 있음
      {
        label: "no-composition",
        data: {
          ...(title !== undefined && { title }),
          ...(teacherName !== undefined && { teacherName }),
          ...(isbn !== undefined && { imwebProdCode: isbn }),
          ...(subjectName !== undefined && { subjectName }),
          ...(entitlementDays !== undefined && { entitlementDays }),
          ...(gradeCategory !== undefined && { gradeCategory }),
        },
      },
      // gradeCategory 컬럼이 없을 수 있음
      {
        label: "no-gradeCategory",
        data: {
          ...(title !== undefined && { title }),
          ...(teacherName !== undefined && { teacherName }),
          ...(isbn !== undefined && { imwebProdCode: isbn }),
          ...(subjectName !== undefined && { subjectName }),
          ...(entitlementDays !== undefined && { entitlementDays }),
          ...(composition !== undefined && { composition }),
        },
      },
      // composition + gradeCategory 둘 다 없을 수 있음
      {
        label: "no-composition-no-gradeCategory",
        data: {
          ...(title !== undefined && { title }),
          ...(teacherName !== undefined && { teacherName }),
          ...(isbn !== undefined && { imwebProdCode: isbn }),
          ...(subjectName !== undefined && { subjectName }),
          ...(entitlementDays !== undefined && { entitlementDays }),
        },
      },
      // 운영/로컬에서 teacherName/subjectName/entitlementDays 컬럼이 없을 수 있음 → 핵심만
      {
        label: "minimal",
        data: {
          ...(title !== undefined && { title }),
          ...(isbn !== undefined && { imwebProdCode: isbn }),
        },
      },
      // 최후 폴백: title만이라도 저장
      { label: "title-only", data: { ...(title !== undefined && { title }) } },
    ];

    let lastErr: unknown = null;
    for (const a of attempts) {
      // 변경할 값이 하나도 없으면 업데이트 스킵
      if (!a.data || Object.keys(a.data).length === 0) continue;
      try {
        await prisma.textbook.update({
          where: { id: textbookId },
          data: a.data as never,
          select: { id: true },
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        // 컬럼 누락이면 더 작은 시도로 진행, 그 외는 즉시 throw
        if (!isMissingColumnError(e)) throw e;
        console.error(`[admin/textbooks/update] textbook.update failed (${a.label}). Trying smaller payload...`, e);
      }
    }

    if (lastErr) throw lastErr;
  } catch (e) {
    console.error("[admin/textbooks/update] textbook.update failed:", e);
    if (isFormData) {
      return NextResponse.redirect(new URL(`${referer}?saved=error`, req.url));
    }
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  // JSON 요청이면 JSON 응답, 아니면 redirect
  return NextResponse.json({ ok: true });
}

