import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  slug: z.string().min(1).max(128).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "INVALID_SLUG"),
  name: z.string().min(1).max(64),
  subjectName: z.string().min(1).max(64),
  subjectTextColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  imageUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  mainImageUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  universityIconUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  promoImageUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  instagramUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  youtubeUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  educationText: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  careerText: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  headerSubText: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  pageBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  newsBgColor: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  // position은 "관리자 목록 순서(드래그앤드랍)"로만 관리합니다.
  // 생성 폼에서는 입력을 없앴으므로, 제출에 position이 없으면 맨 뒤로 자동 배치합니다.
  position: z
    .string()
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), { message: "INVALID_POSITION" }),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function POST(req: Request) {
  await requireAdminUser();

  const form = await req.formData();
  const parseJsonIds = (raw: unknown): string[] => {
    if (typeof raw !== "string" || !raw.trim()) return [];
    try {
      const v = JSON.parse(raw);
      if (!Array.isArray(v)) return [];
      return v.filter((x) => typeof x === "string" && x.trim().length > 0);
    } catch {
      return [];
    }
  };
  const selectedCourseIds = parseJsonIds(form.get("selectedCourseIds"));
  const selectedTextbookIds = parseJsonIds(form.get("selectedTextbookIds"));

  const parsed = Schema.safeParse({
    slug: typeof form.get("slug") === "string" ? form.get("slug") : "",
    name: typeof form.get("name") === "string" ? form.get("name") : "",
    subjectName: typeof form.get("subjectName") === "string" ? form.get("subjectName") : "",
    subjectTextColor: typeof form.get("subjectTextColor") === "string" ? form.get("subjectTextColor") : undefined,
    imageUrl: typeof form.get("imageUrl") === "string" ? form.get("imageUrl") : undefined,
    mainImageUrl: typeof form.get("mainImageUrl") === "string" ? form.get("mainImageUrl") : undefined,
    universityIconUrl: typeof form.get("universityIconUrl") === "string" ? form.get("universityIconUrl") : undefined,
    promoImageUrl: typeof form.get("promoImageUrl") === "string" ? form.get("promoImageUrl") : undefined,
    instagramUrl: typeof form.get("instagramUrl") === "string" ? form.get("instagramUrl") : undefined,
    youtubeUrl: typeof form.get("youtubeUrl") === "string" ? form.get("youtubeUrl") : undefined,
    educationText: typeof form.get("educationText") === "string" ? form.get("educationText") : undefined,
    careerText: typeof form.get("careerText") === "string" ? form.get("careerText") : undefined,
    headerSubText: typeof form.get("headerSubText") === "string" ? form.get("headerSubText") : undefined,
    pageBgColor: typeof form.get("pageBgColor") === "string" ? form.get("pageBgColor") : undefined,
    newsBgColor: typeof form.get("newsBgColor") === "string" ? form.get("newsBgColor") : undefined,
    position: typeof form.get("position") === "string" ? form.get("position") : undefined,
    isActive: typeof form.get("isActive") === "string" ? form.get("isActive") : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  try {
    // Ensure optional columns exist (deployment-safe; avoids Prisma migrations).
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedCourseIds" JSONB;');
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "selectedTextbookIds" JSONB;');
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "subjectTextColor" TEXT;');
      await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "universityIconUrl" TEXT;');
    } catch {
      // ignore
    }

    let position = typeof parsed.data.position === "number" ? parsed.data.position : undefined;
    if (position === undefined) {
      const maxPos = await prisma.teacher.aggregate({ _max: { position: true } });
      position = (maxPos._max.position ?? 0) + 1;
    }

    const created = await prisma.teacher.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        subjectName: parsed.data.subjectName,
        subjectTextColor: parsed.data.subjectTextColor,
        imageUrl: parsed.data.imageUrl,
        mainImageUrl: parsed.data.mainImageUrl,
        universityIconUrl: parsed.data.universityIconUrl,
        promoImageUrl: parsed.data.promoImageUrl,
        instagramUrl: parsed.data.instagramUrl,
        youtubeUrl: parsed.data.youtubeUrl,
        educationText: parsed.data.educationText,
        careerText: parsed.data.careerText,
        headerSubText: parsed.data.headerSubText,
        pageBgColor: parsed.data.pageBgColor,
        newsBgColor: parsed.data.newsBgColor,
        position,
        isActive: parsed.data.isActive ?? true,
      } as any,
      select: { id: true },
    });

    // Save selected products (raw JSONB columns)
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "Teacher" SET "selectedCourseIds" = $2::jsonb, "selectedTextbookIds" = $3::jsonb WHERE "id" = $1',
        created.id,
        JSON.stringify(selectedCourseIds),
        JSON.stringify(selectedTextbookIds)
      );
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 400 });
  }
}


