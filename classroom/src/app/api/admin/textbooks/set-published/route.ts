import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  textbookId: z.string().min(1),
  isPublished: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === "1"),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    textbookId: typeof form.get("textbookId") === "string" ? form.get("textbookId") : "",
    isPublished: typeof form.get("isPublished") === "string" ? form.get("isPublished") : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const tb = await prisma.textbook.findUnique({
    where: { id: parsed.data.textbookId },
    select: { id: true, ownerId: true },
  });
  if (!tb || tb.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.textbook.update({
    where: { id: tb.id },
    data: { isPublished: parsed.data.isPublished },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


