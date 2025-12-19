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
  const form = await req.formData();
  const parsed = Schema.safeParse({
    email: typeof form.get("email") === "string" ? form.get("email") : "",
  });
  if (!parsed.success) return NextResponse.redirect(new URL("/enter?error=1", req.url));

  if (!ALLOWED.has(parsed.data.email)) return NextResponse.redirect(new URL("/enter?error=1", req.url));

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(TEACHER_COOKIE, parsed.data.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d
  });
  return res;
}


