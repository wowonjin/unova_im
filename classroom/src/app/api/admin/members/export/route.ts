import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminUser();

    // 모든 회원 조회
    const members = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        email: true,
        name: true,
        phone: true,
        imwebMemberCode: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            enrollments: true,
            textbookEntitlements: true,
          },
        },
      },
    });

    // 엑셀 데이터 준비
    const data = members.map((m) => ({
      이메일: m.email,
      이름: m.name || "",
      전화번호: m.phone || "",
      아임웹회원코드: m.imwebMemberCode || "",
      가입일: m.createdAt.toISOString().slice(0, 10),
      마지막로그인: m.lastLoginAt?.toISOString().slice(0, 10) || "",
      수강강좌수: m._count.enrollments,
      교재수: m._count.textbookEntitlements,
    }));

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // 열 너비 설정
    ws["!cols"] = [
      { wch: 30 }, // 이메일
      { wch: 15 }, // 이름
      { wch: 15 }, // 전화번호
      { wch: 20 }, // 아임웹회원코드
      { wch: 12 }, // 가입일
      { wch: 12 }, // 마지막로그인
      { wch: 10 }, // 수강강좌수
      { wch: 10 }, // 교재수
    ];

    XLSX.utils.book_append_sheet(wb, ws, "회원목록");

    // 버퍼로 변환
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성 (현재 날짜 포함)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `회원목록_${dateStr}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Member export error:", error);
    return NextResponse.json({ ok: false, error: "EXPORT_FAILED" }, { status: 500 });
  }
}

