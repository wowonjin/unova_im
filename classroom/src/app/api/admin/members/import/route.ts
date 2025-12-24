import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// 이메일 유효성 검사
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 전화번호 정규화
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  // 숫자만 추출
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits;
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "파일이 없습니다." }, { status: 400 });
    }

    // 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });

    // 첫 번째 시트 가져오기
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ ok: false, error: "시트가 없습니다." }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "데이터가 없습니다." }, { status: 400 });
    }

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        // 이메일 열 찾기 (다양한 이름 지원)
        const email = String(
          row["이메일"] ?? row["email"] ?? row["Email"] ?? row["EMAIL"] ?? ""
        ).trim().toLowerCase();

        if (!email || !isValidEmail(email)) {
          failed++;
          continue;
        }

        // 이름 열 찾기
        const name = String(
          row["이름"] ?? row["name"] ?? row["Name"] ?? row["NAME"] ?? ""
        ).trim() || null;

        // 전화번호 열 찾기
        const phoneRaw = String(
          row["전화번호"] ?? row["phone"] ?? row["Phone"] ?? row["PHONE"] ?? 
          row["휴대폰"] ?? row["연락처"] ?? ""
        ).trim();
        const phone = normalizePhone(phoneRaw);

        // 아임웹 회원코드 (선택)
        const imwebMemberCode = String(
          row["아임웹회원코드"] ?? row["member_code"] ?? row["memberCode"] ?? ""
        ).trim() || null;

        // 사용자 생성 또는 업데이트
        await prisma.user.upsert({
          where: { email },
          update: {
            name: name || undefined,
            phone: phone || undefined,
            imwebMemberCode: imwebMemberCode || undefined,
          },
          create: {
            email,
            name,
            phone,
            imwebMemberCode,
          },
        });

        success++;
      } catch (e) {
        console.error("Row import error:", e);
        failed++;
      }
    }

    return NextResponse.json({ ok: true, success, failed });
  } catch (error) {
    console.error("Member import error:", error);
    return NextResponse.json({ ok: false, error: "IMPORT_FAILED" }, { status: 500 });
  }
}

