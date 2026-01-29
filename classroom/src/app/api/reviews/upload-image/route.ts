import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "INVALID_CONTENT_TYPE" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
  }
  if ((file.size ?? 0) <= 0) {
    return NextResponse.json({ ok: false, error: "EMPTY_FILE" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
  }
  if (!file.type || !file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "UNSUPPORTED_FILE" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  const base64 = bytes.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return NextResponse.json({ ok: true, url: dataUrl });
}
