import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const BodySchema = z.object({
  noticeId: z.string().min(1),
  isPublished: z.union([z.literal("0"), z.literal("1"), z.literal("true"), z.literal("false"), z.literal("on")]),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = BodySchema.safeParse({
    noticeId: form.get("noticeId"),
    isPublished: form.get("isPublished"),
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const isPublished = parsed.data.isPublished === "1" || parsed.data.isPublished === "true" || parsed.data.isPublished === "on";

  const n = await prisma.notice.findUnique({
    where: { id: parsed.data.noticeId },
    select: { id: true, authorId: true },
  });
  if (!n || n.authorId !== teacher.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  await prisma.notice.update({ where: { id: n.id }, data: { isPublished } });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/notices", req.url));
}


