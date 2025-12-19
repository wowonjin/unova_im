import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  imwebProdNo: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? Number(s) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0), { message: "INVALID_PROD_NO" }),
  imwebProdCode: z
    .string()
    .optional()
    .transform((s) => (s ? s.trim() : ""))
    .transform((s) => (s.length ? s : null)),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const form = await req.formData();
  const raw = {
    courseId: form.get("courseId"),
    imwebProdNo: form.get("imwebProdNo"),
    imwebProdCode: form.get("imwebProdCode"),
  };

  const parsed = Schema.safeParse({
    courseId: typeof raw.courseId === "string" ? raw.courseId : "",
    imwebProdNo: typeof raw.imwebProdNo === "string" ? raw.imwebProdNo : undefined,
    imwebProdCode: typeof raw.imwebProdCode === "string" ? raw.imwebProdCode : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });
  if (!course || course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  await prisma.course.update({
    where: { id: course.id },
    data: {
      imwebProdNo: parsed.data.imwebProdNo,
      imwebProdCode: parsed.data.imwebProdCode,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin", req.url));
}


