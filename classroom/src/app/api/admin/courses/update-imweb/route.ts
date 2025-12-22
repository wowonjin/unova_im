import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";

export const runtime = "nodejs";

const Schema = z.object({
  courseId: z.string().min(1),
  op: z.enum(["set", "add", "remove"]).optional(),
  imwebProdCode: z
    .string()
    .optional()
    .transform((s) => (s ? s.trim() : "")),
  imwebProdCodeId: z.string().optional(),
});

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return req.headers.get("x-unova-client") === "1" || accept.includes("application/json");
}

export async function POST(req: Request) {
  const json = wantsJson(req);
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const form = await req.formData();
  const raw = {
    courseId: form.get("courseId"),
    op: form.get("op"),
    imwebProdCode: form.get("imwebProdCode"),
    imwebProdCodeId: form.get("imwebProdCodeId"),
  };

  const parsed = Schema.safeParse({
    courseId: typeof raw.courseId === "string" ? raw.courseId : "",
    op: typeof raw.op === "string" ? raw.op : undefined,
    imwebProdCode: typeof raw.imwebProdCode === "string" ? raw.imwebProdCode : undefined,
    imwebProdCodeId: typeof raw.imwebProdCodeId === "string" ? raw.imwebProdCodeId : undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, ownerId: true },
  });
  if (!course || course.ownerId !== teacher.id) return NextResponse.json({ ok: false, error: "COURSE_NOT_FOUND" }, { status: 404 });

  const op = parsed.data.op ?? "set"; // 기본은 단일 코드 "저장"
  const baseUrl = new URL(req.headers.get("referer") || `/admin/course/${course.id}?tab=settings`, req.url);
  baseUrl.searchParams.set("tab", "settings");

  if (op === "set") {
    const code = (parsed.data.imwebProdCode || "").trim();
    // 빈 값이면 "연동 해제" (이 강좌의 코드 매핑 제거)
    if (!code.length) {
      await prisma.courseImwebProdCode.deleteMany({ where: { courseId: course.id } });
      baseUrl.searchParams.set("imweb", "cleared");
      if (json) return NextResponse.json({ ok: true, status: "cleared", redirectTo: baseUrl.toString() });
      return NextResponse.redirect(baseUrl);
    }

    const existing = await prisma.courseImwebProdCode.findUnique({
      where: { code },
      select: { id: true, courseId: true },
    });
    // 다른 강좌에서 이미 쓰는 코드면 저장 불가
    if (existing && existing.courseId !== course.id) {
      baseUrl.searchParams.set("imweb", "duplicate");
      if (json) return NextResponse.json({ ok: false, error: "IMWEB_PROD_CODE_IN_USE", redirectTo: baseUrl.toString() }, { status: 409 });
      return NextResponse.redirect(baseUrl);
    }

    // 이 강좌는 "상품 코드 1개"만 유지하도록 정리
    await prisma.$transaction(async (tx) => {
      // 기존에 여러 개가 있다면, 현재 코드 외는 제거
      await tx.courseImwebProdCode.deleteMany({ where: { courseId: course.id, code: { not: code } } });
      // 현재 코드는 없으면 생성 (있으면 그대로)
      const ok = await tx.courseImwebProdCode.findUnique({ where: { code }, select: { id: true } });
      if (!ok) await tx.courseImwebProdCode.create({ data: { courseId: course.id, code } });
    });

    baseUrl.searchParams.set("imweb", "saved");
    if (json) return NextResponse.json({ ok: true, status: "saved", redirectTo: baseUrl.toString() });
    return NextResponse.redirect(baseUrl);
  } else if (op === "add") {
    const code = (parsed.data.imwebProdCode || "").trim();
    if (!code.length) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

    const existing = await prisma.courseImwebProdCode.findUnique({
      where: { code },
      select: { id: true, courseId: true },
    });
    if (existing && existing.courseId !== course.id) {
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 });
    }
    if (existing && existing.courseId === course.id) {
      // 이미 이 강좌에 등록된 코드
      return NextResponse.json({ ok: true, status: "already_exists" });
    }
    await prisma.courseImwebProdCode.create({
      data: { courseId: course.id, code },
    });
    return NextResponse.json({ ok: true, status: "added" });
  } else {
    const id = (parsed.data.imwebProdCodeId || "").trim();
    if (!id.length) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    await prisma.courseImwebProdCode.deleteMany({
      where: { id, courseId: course.id },
    });
  }

  if (json) return NextResponse.json({ ok: true, status: "ok", redirectTo: baseUrl.toString() });
  return NextResponse.redirect(baseUrl);
}


