import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const TEACHER_COOKIE = "unova_teacher_email";
const ALLOWED = new Set(
  [
    "admin@gmail.com",
    "admin1@gmail.com",
    "admin2@gmail.com",
    "admin3@gmail.com",
    "admin4@gmail.com",
    "admin5@gmail.com",
    "admin6@gmail.com",
  ].map((x) => x.toLowerCase())
);

const Schema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: Request) {
  let body: unknown;
  
  // JSON 또는 FormData 둘 다 지원
  const contentType = req.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  
  if (isJson) {
    body = await req.json();
  } else {
    const form = await req.formData();
    body = { email: form.get("email") };
  }

  const parsed = Schema.safeParse(body);
  
  if (!parsed.success) {
    if (isJson) {
      return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
    }
    return NextResponse.redirect(new URL("/enter?error=1", req.url), 303);
  }

  if (!ALLOWED.has(parsed.data.email)) {
    if (isJson) {
      return NextResponse.json({ success: false, error: "Email not allowed" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/enter?error=1", req.url), 303);
  }

  // JSON 요청이면 JSON 응답
  if (isJson) {
    const res = NextResponse.json({ success: true });
    res.cookies.set(TEACHER_COOKIE, parsed.data.email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30d
    });
    return res;
  }

  // HTML Form 요청이면 리다이렉트 응답
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(TEACHER_COOKIE, parsed.data.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d
  });
  return res;
}








