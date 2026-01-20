import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

const Schema = z.object({
  courseId: z.string().min(1),
  codeId: z.string().min(1),
});

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const parsed = Schema.safeParse({
    courseId: form.get("courseId"),
    codeId: form.get("codeId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });

  if (!course || (!teacher.isAdmin && course.ownerId !== teacher.id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // 해당 코드가 이 강좌에 속하는지 확인
  const codeRecord = await prisma.courseImwebProdCode.findFirst({
    where: { id: parsed.data.codeId, courseId: course.id },
  });

  if (!codeRecord) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.courseImwebProdCode.delete({
    where: { id: codeRecord.id },
  });

  return NextResponse.json({ ok: true });
}

