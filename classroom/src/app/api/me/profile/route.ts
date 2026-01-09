import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
  addressDetail: z.string().max(200).optional(),
  birthday: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "INVALID_BIRTHDAY" }),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true,
      addressDetail: true,
      birthday: true,
      profileImageUrl: true,
    },
  });

  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error }, { status: 400 });
  }

  const data = parsed.data;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name.trim(),
      phone: typeof data.phone === "string" ? data.phone.trim() || null : null,
      address: typeof data.address === "string" ? data.address.trim() || null : null,
      addressDetail: typeof data.addressDetail === "string" ? data.addressDetail.trim() || null : null,
      birthday: typeof data.birthday === "string" ? data.birthday.trim() || null : null,
    },
    select: {
      email: true,
      name: true,
      phone: true,
      address: true,
      addressDetail: true,
      birthday: true,
    },
  });

  return NextResponse.json({ ok: true, profile: updated });
}

