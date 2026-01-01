import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  slug: z.string().min(1).max(128).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "INVALID_SLUG"),
  name: z.string().min(1).max(64),
  subjectName: z.string().min(1).max(64),
  imageUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  mainImageUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  promoImageUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  instagramUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  youtubeUrl: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  educationText: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  careerText: z.string().trim().optional().transform((v) => (v ? v : null)).nullable(),
  position: z
    .string()
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : 0))
    .refine((v) => Number.isFinite(v) && v >= 0, { message: "INVALID_POSITION" }),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function POST(req: Request) {
  await requireAdminUser();

  const form = await req.formData();
  const parsed = Schema.safeParse({
    slug: typeof form.get("slug") === "string" ? form.get("slug") : "",
    name: typeof form.get("name") === "string" ? form.get("name") : "",
    subjectName: typeof form.get("subjectName") === "string" ? form.get("subjectName") : "",
    imageUrl: typeof form.get("imageUrl") === "string" ? form.get("imageUrl") : undefined,
    mainImageUrl: typeof form.get("mainImageUrl") === "string" ? form.get("mainImageUrl") : undefined,
    promoImageUrl: typeof form.get("promoImageUrl") === "string" ? form.get("promoImageUrl") : undefined,
    instagramUrl: typeof form.get("instagramUrl") === "string" ? form.get("instagramUrl") : undefined,
    youtubeUrl: typeof form.get("youtubeUrl") === "string" ? form.get("youtubeUrl") : undefined,
    educationText: typeof form.get("educationText") === "string" ? form.get("educationText") : undefined,
    careerText: typeof form.get("careerText") === "string" ? form.get("careerText") : undefined,
    position: typeof form.get("position") === "string" ? form.get("position") : undefined,
    isActive: typeof form.get("isActive") === "string" ? form.get("isActive") : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  try {
    const created = await prisma.teacher.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        subjectName: parsed.data.subjectName,
        imageUrl: parsed.data.imageUrl,
        mainImageUrl: parsed.data.mainImageUrl,
        promoImageUrl: parsed.data.promoImageUrl,
        instagramUrl: parsed.data.instagramUrl,
        youtubeUrl: parsed.data.youtubeUrl,
        educationText: parsed.data.educationText,
        careerText: parsed.data.careerText,
        position: parsed.data.position,
        isActive: parsed.data.isActive ?? true,
      } as any,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 400 });
  }
}


