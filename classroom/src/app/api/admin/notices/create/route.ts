import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacherUser } from "@/lib/current-user";
import sanitizeHtml from "sanitize-html";

export const runtime = "nodejs";

function slugify(s: string) {
  const base = s
    .trim()
    .toLowerCase()
    // keep alnum/-, collapse others to -
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "";
}

export async function POST(req: Request) {
  const teacher = await getCurrentTeacherUser();
  if (!teacher) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const categoryRaw = form.get("category");
  const titleRaw = form.get("title");
  const bodyRaw = form.get("body");
  const isPublishedRaw = form.get("isPublished");

  const categoryInput = typeof categoryRaw === "string" ? categoryRaw.trim() : "";
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const bodyRawText = typeof bodyRaw === "string" ? bodyRaw : "";
  const sanitizedBody = sanitizeHtml(bodyRawText, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
      span: ["style"],
    },
    allowedStyles: {
      span: {
        color: [/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i],
        "font-size": [/^\d{1,2}px$/],
      },
    },
    allowedSchemes: ["http", "https", "data"],
    allowProtocolRelative: false,
  }).trim();

  const body = sanitizedBody;
  if (!categoryInput || !title || !body) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  // 선생님별 카테고리 자동 보정
  // - "선생님 공지사항"처럼 공통값만 들어오면 → "선생님 공지사항 - {선생님이름}"
  // - 이미 이름이 포함된 경우는 그대로 유지
  const teacherName = (teacher.name || "").trim();
  const isTeacherNotice = categoryInput.includes("선생님") && categoryInput.includes("공지");
  const category =
    teacherName && isTeacherNotice && !categoryInput.includes(teacherName)
      ? `선생님 공지사항 - ${teacherName}`
      : categoryInput;

  const isPublished =
    typeof isPublishedRaw === "string" ? isPublishedRaw === "1" || isPublishedRaw === "true" || isPublishedRaw === "on" : true;

  // slug는 사용자 입력 없이 자동 생성(카테고리+제목 기반)
  let slug = slugify(`${category}-${title}`);
  if (!slug) {
    const d = new Date();
    slug = `notice-${d.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ensure unique
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.notice.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) break;
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  await prisma.notice.create({
    data: {
      authorId: teacher.id,
      category,
      title,
      slug,
      body,
      isPublished,
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") || "/admin/notices", req.url));
}


