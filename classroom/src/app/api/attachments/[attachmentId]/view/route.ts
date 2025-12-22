import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getStorageRoot, safeJoin } from "@/lib/storage";
import { isAllCoursesTestModeFromRequest } from "@/lib/test-mode";

export const runtime = "nodejs";

const ParamsSchema = z.object({ attachmentId: z.string().min(1) });

async function canAccessAttachment(userId: string, isAdmin: boolean, attachmentId: string, bypassEnrollment: boolean) {
  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      lesson: { select: { id: true, courseId: true } },
      course: { select: { id: true } },
    },
  });
  if (!att) return null;

  const courseId = att.courseId ?? att.lesson?.courseId ?? null;
  if (!courseId) return null;

  if (isAdmin || bypassEnrollment) return att;

  const now = new Date();
  const ok = await prisma.enrollment.findFirst({
    where: { userId, courseId, status: "ACTIVE", endAt: { gt: now } },
    select: { id: true },
  });
  if (!ok) return null;
  return att;
}

export async function GET(_req: Request, ctx: { params: Promise<{ attachmentId: string }> }) {
  const bypassEnrollment = isAllCoursesTestModeFromRequest(_req);
  const user = await requireCurrentUser();
  const { attachmentId } = ParamsSchema.parse(await ctx.params);

  const att = await canAccessAttachment(user.id, user.isAdmin, attachmentId, bypassEnrollment);
  if (!att) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let filePath: string;
  try {
    filePath = safeJoin(getStorageRoot(), att.storedPath);
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "FILE_MISSING" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers();
  headers.set("content-type", att.mimeType || "application/octet-stream");
  headers.set("content-length", String(stat.size));
  headers.set("content-disposition", `inline; filename="${encodeURIComponent(att.originalName || att.title)}"`);

  return new NextResponse(webStream, { status: 200, headers });
}


