import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  price: z.string().transform((s) => (s ? parseInt(s) : null)),
  originalPrice: z.string().transform((s) => (s ? parseInt(s) : null)),
  rating: z.string().transform((s) => (s ? parseFloat(s) : null)),
  reviewCount: z.string().transform((s) => parseInt(s) || 0),
  tags: z.string().transform((s) => 
    s.split(",").map((t) => t.trim()).filter(Boolean)
  ),
  benefits: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
  features: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
  teacherTitle: z.string().transform((s) => s.trim() || null),
  teacherDescription: z.string().transform((s) => s.trim() || null),
  previewVimeoId: z.string().transform((s) => s.trim() || null),
  refundPolicy: z.string().transform((s) => s.trim() || null),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData();
  const data: Record<string, string> = {};
  
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      data[key] = value;
    }
  }

  const parsed = Schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const { courseId, price, originalPrice, rating, reviewCount, tags, benefits, features, teacherTitle, teacherDescription, previewVimeoId, refundPolicy } = parsed.data;

  // Verify ownership
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, ownerId: true },
  });

  if (!course || course.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Calculate daily price
  const dailyPrice = price ? Math.round(price / 30) : null;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      price,
      originalPrice,
      dailyPrice,
      rating,
      reviewCount,
      tags,
      benefits,
      features,
      teacherTitle,
      teacherDescription,
      previewVimeoId,
      refundPolicy,
    },
  });

  return NextResponse.json({ ok: true });
}

