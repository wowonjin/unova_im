import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  price: z.string().transform((s) => (s ? parseInt(s) : null)),
  originalPrice: z.string().transform((s) => (s ? parseInt(s) : null)),
  rating: z.string().transform((s) => (s ? parseFloat(s) : null)),
  reviewCount: z.string().transform((s) => parseInt(s) || 0),
  teacherTitle: z.string().transform((s) => s.trim() || null),
  teacherDescription: z.string().transform((s) => s.trim() || null),
  tags: z.string().transform((s) => 
    s.split(",").map((t) => t.trim()).filter(Boolean)
  ),
  benefits: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
  features: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
  description: z.string().transform((s) => s.trim() || null),
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

  const { textbookId, price, originalPrice, rating, reviewCount, teacherTitle, teacherDescription, tags, benefits, features, description } = parsed.data;

  // Verify ownership
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });

  if (!textbook || textbook.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.textbook.update({
    where: { id: textbookId },
    data: {
      price,
      originalPrice,
      rating,
      reviewCount,
      teacherTitle,
      teacherDescription,
      tags,
      benefits,
      features,
      description,
    },
  });

  return NextResponse.json({ ok: true });
}

