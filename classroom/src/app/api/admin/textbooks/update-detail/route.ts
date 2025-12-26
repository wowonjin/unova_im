import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  price: z.string().transform((s) => (s ? parseInt(s) : null)),
  originalPrice: z.string().transform((s) => (s ? parseInt(s) : null)),
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
  extraOptions: z.string().optional().transform((s) => (typeof s === "string" ? s : "")),
  description: z.string().transform((s) => s.trim() || null),
});

function parseExtraOptions(text: string): { name: string; value: string }[] {
  const lines = (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const out: { name: string; value: string }[] = [];
  for (const line of lines) {
    // Allow: "name: value" or "name - value"
    const idx = line.indexOf(":");
    const parts =
      idx >= 0
        ? [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
        : line.split("-").map((x) => x.trim());

    const name = parts[0] || "";
    const value = parts.slice(1).join(" - ").trim();
    if (!name) continue;
    out.push({ name, value });
  }
  return out;
}

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

  const { textbookId, price, originalPrice, teacherTitle, teacherDescription, tags, benefits, features, extraOptions, description } = parsed.data;
  const extraOptionsJson = parseExtraOptions(extraOptions || "");

  // Verify ownership
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, ownerId: true },
  });

  if (!textbook || textbook.ownerId !== teacher.id) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        price,
        originalPrice,
        teacherTitle,
        teacherDescription,
        tags,
        benefits,
        features,
        extraOptions: extraOptionsJson,
        description,
      } as never,
    });
  } catch (e) {
    // 배포 환경에서 컬럼이 아직 없을 수 있음(마이그레이션 누락). extraOptions 없이 재시도.
    console.error("[admin/textbooks/update-detail] textbook.update failed, retrying without extraOptions:", e);
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        price,
        originalPrice,
        teacherTitle,
        teacherDescription,
        tags,
        benefits,
        features,
        description,
      } as never,
    });
  }

  return NextResponse.json({ ok: true });
}

