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
  // - 사용자가 이미 "{선생님 공지사항 - 이름}" 형태로 선택/입력했다면 절대 덮어쓰지 않음
  const teacherName = (teacher.name || "").trim();
  const teacherPrefix = "선생님 공지사항";
  const normalizedCategory = categoryInput.replace(/\s+/g, " ").trim();
  const category =
    teacherName && (normalizedCategory === teacherPrefix || normalizedCategory === `${teacherPrefix}-` || normalizedCategory === `${teacherPrefix} -`)
      ? `${teacherPrefix} - ${teacherName}`
      : normalizedCategory;

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

  // fetch()로 호출되면 리다이렉트(307/308)를 따라가며 POST를 재전송할 수 있어(=페이지 라우트에 POST → 405)
  // API 호출은 JSON으로 응답하고, 브라우저에서 직접 접근/폼 제출(HTML)일 때만 303으로 리다이렉트합니다.
  const accept = req.headers.get("accept") || "";
  const referer = req.headers.get("referer");
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL(referer || "/notices", req.url), { status: 303 });
  }

  return NextResponse.json({ ok: true, slug });
}


