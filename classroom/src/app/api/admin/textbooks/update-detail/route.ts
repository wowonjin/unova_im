import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

function isMissingColumnError(e: unknown): boolean {
  return Boolean((e as any)?.code === "P2022");
}

const Schema = z.object({
  textbookId: z.string().min(1),
  price: z.string().transform((s) => (s ? parseInt(s) : null)),
  originalPrice: z.string().transform((s) => (s ? parseInt(s) : null)),
  teacherTitle: z.string().transform((s) => s.trim() || null),
  teacherDescription: z.string().transform((s) => s.trim() || null),
  tags: z.string().transform((s) => 
    s.split(",").map((t) => t.trim()).filter(Boolean)
  ),
  textbookType: z.string().optional().transform((s) => (typeof s === "string" ? s.trim() || null : null)),
  benefits: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
  features: z.string().transform((s) => 
    s.split("\n").map((t) => t.trim()).filter(Boolean)
  ),
  extraOptions: z.string().optional().transform((s) => (typeof s === "string" ? s : "")),
  description: z.string().transform((s) => s.trim() || null),
  relatedTextbookIds: z.string().optional().transform((s) => {
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }),
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

  const { textbookId, price, originalPrice, teacherTitle, teacherDescription, tags, textbookType, benefits, features, extraOptions, description, relatedTextbookIds } = parsed.data;
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
    const attempts: Array<{ label: string; data: Record<string, unknown> }> = [
      {
        label: "full",
        data: {
          price,
          originalPrice,
          teacherTitle,
          teacherDescription,
          tags,
          textbookType,
          benefits,
          features,
          extraOptions: extraOptionsJson,
          description,
          relatedTextbookIds,
        },
      },
      {
        label: "no-extraOptions-related",
        data: {
          price,
          originalPrice,
          teacherTitle,
          teacherDescription,
          tags,
          textbookType,
          benefits,
          features,
          description,
        },
      },
      // 더 강한 폴백(컬럼 누락 환경): 가격/태그 정도만
      {
        label: "minimal",
        data: {
          price,
          originalPrice,
          tags,
        },
      },
      // 최후 폴백: 가격만이라도
      {
        label: "price-only",
        data: {
          price,
          originalPrice,
        },
      },
    ];

    let lastErr: unknown = null;
    for (const a of attempts) {
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
        if (!isMissingColumnError(e)) throw e;
        console.error(`[admin/textbooks/update-detail] textbook.update failed (${a.label}). Trying smaller payload...`, e);
      }
    }

    if (lastErr) throw lastErr;
  } catch (e) {
    console.error("[admin/textbooks/update-detail] textbook.update failed:", e);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

