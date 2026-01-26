import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const MAX_EXPORT_ROWS = (() => {
  const raw = Number(process.env.EXPORT_MEMBERS_MAX);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 5000;
})();
const BATCH_SIZE = 500;

export async function GET(req: Request) {
  try {
    await requireAdminUser();

    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Math.min(
      MAX_EXPORT_ROWS,
      Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : MAX_EXPORT_ROWS
    );

    const header = [
      "이메일",
      "이름",
      "연락처",
      "주소",
      "상세주소",
      "생년월일",
      "아임웹회원코드",
      "가입일",
      "마지막로그인",
      "수강강좌수",
      "교재수",
    ];

    // 워크북/시트 생성 (대량 데이터를 위한 배치 처리)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([], { header });
    let cursorId: string | null = null;
    let fetched = 0;
    let firstBatch = true;

    while (fetched < limit) {
      const take = Math.min(BATCH_SIZE, limit - fetched);
      const members = await prisma.user.findMany({
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        take,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          address: true,
          addressDetail: true,
          birthday: true,
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

      if (members.length === 0) break;
      cursorId = members[members.length - 1]?.id ?? null;
      fetched += members.length;

      const batch = members.map((m) => ({
        이메일: m.email,
        이름: m.name || "",
        연락처: m.phone || "",
        주소: m.address || "",
        상세주소: m.addressDetail || "",
        생년월일: m.birthday || "",
        아임웹회원코드: m.imwebMemberCode || "",
        가입일: m.createdAt.toISOString().slice(0, 10),
        마지막로그인: m.lastLoginAt?.toISOString().slice(0, 10) || "",
        수강강좌수: m._count.enrollments,
        교재수: m._count.textbookEntitlements,
      }));

      XLSX.utils.sheet_add_json(ws, batch, {
        header,
        skipHeader: !firstBatch,
        origin: firstBatch ? 0 : -1,
      });
      firstBatch = false;
    }

    // 열 너비 설정
    ws["!cols"] = [
      { wch: 30 }, // 이메일
      { wch: 15 }, // 이름
      { wch: 15 }, // 연락처
      { wch: 40 }, // 주소
      { wch: 20 }, // 상세주소
      { wch: 12 }, // 생년월일
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

