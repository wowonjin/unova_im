import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await destroySession();
  
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect");
  
  // 아임웹으로 리다이렉트하거나 로그인 페이지로 이동
  if (redirectTo) {
    return NextResponse.redirect(redirectTo);
  }
  
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function POST(req: Request) {
  await destroySession();
  return NextResponse.json({ ok: true });
}

