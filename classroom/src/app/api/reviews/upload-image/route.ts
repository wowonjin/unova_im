import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

// 간단한 이미지 업로드 (Base64 data URL 반환)
// 프로덕션에서는 GCS 또는 S3 등 외부 스토리지 사용 권장
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    // 이미지 타입 확인
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "NOT_AN_IMAGE" }, { status: 400 });
    }

    // Base64 data URL로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // 고유 ID 생성 (추후 참조용)
    const imageId = crypto.randomUUID();

    return NextResponse.json({ 
      ok: true, 
      url: dataUrl,
      imageId,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ ok: false, error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
