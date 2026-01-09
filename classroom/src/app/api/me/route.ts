import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ ok: true, user });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  // 안전장치: 관리자는 여기서 탈퇴 불가 (운영/관리 기능 보호)
  if (user.isAdmin) {
    return NextResponse.json({ ok: false, error: "ADMIN_CANNOT_WITHDRAW" }, { status: 400 });
  }

  // 세션 제거(쿠키 제거 포함)
  await destroySession();

  // 유저 삭제 (관련 데이터는 schema의 onDelete: Cascade로 정리)
  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}

