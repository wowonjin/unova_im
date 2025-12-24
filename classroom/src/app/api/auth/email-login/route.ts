import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { imwebSearchMemberByEmail } from "@/lib/imweb";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const { email } = parsed.data;

    // 아임웹에서 회원 검색
    const imwebMember = await imwebSearchMemberByEmail(email);
    
    if (!imwebMember) {
      // 아임웹에 등록되지 않은 회원
      return NextResponse.json({ ok: false, error: "NOT_REGISTERED" }, { status: 404 });
    }

    // 사용자 조회 또는 생성 (아임웹 정보로 업데이트)
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // 신규 사용자 생성 (아임웹 정보 포함)
      user = await prisma.user.create({
        data: { 
          email, 
          lastLoginAt: new Date(),
          imwebMemberCode: imwebMember.memberCode,
          name: imwebMember.name,
          phone: imwebMember.phone,
          profileImageUrl: imwebMember.profileImg,
        },
        select: { id: true },
      });
    } else {
      // 기존 사용자 정보 업데이트 (아임웹 정보로 동기화)
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          imwebMemberCode: imwebMember.memberCode,
          name: imwebMember.name || undefined,
          phone: imwebMember.phone || undefined,
          profileImageUrl: imwebMember.profileImg || undefined,
        },
      });
    }

    // 세션 생성 (6시간 유효)
    await createSession(user.id);

    return NextResponse.json({ 
      ok: true,
      user: {
        name: imwebMember.name,
        profileImg: imwebMember.profileImg,
      }
    });
  } catch (error) {
    console.error("Email login error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

