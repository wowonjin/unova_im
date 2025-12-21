import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 로그인 기능 제거: 기존 엔드포인트는 호환을 위해 /admin으로 이동만 시킴
  // (예전 북마크/폼 제출이 있어도 동작하도록 유지)
  return NextResponse.redirect(new URL("/admin", req.url), 303);
}








