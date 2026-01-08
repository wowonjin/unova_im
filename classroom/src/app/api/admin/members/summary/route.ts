import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/current-user";

export const runtime = "nodejs";

const QuerySchema = z.object({
  userId: z.string().min(1),
});

export async function GET(req: Request) {
  const teacher = await requireAdminUser();

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ userId: url.searchParams.get("userId") });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  const { userId } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true,
      addressDetail: true,
      imwebMemberCode: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

  // 주문 목록(해당 선생님 소유 상품 기준) - PENDING은 제외(미결제/미확정)
  const orders = await prisma.order.findMany({
    where: {
      userId,
      NOT: { status: "PENDING" },
      OR: [{ course: { ownerId: teacher.id } }, { textbook: { ownerId: teacher.id } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      orderNo: true,
      productName: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const totalPaidAmount = completed.reduce((sum, o) => sum + o.amount, 0);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      phone: user.phone ?? null,
      address: user.address ?? null,
      addressDetail: user.addressDetail ?? null,
      imwebMemberCode: user.imwebMemberCode ?? null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    },
    orders: orders.map((o) => ({
      orderNo: o.orderNo,
      productName: o.productName,
      amount: o.amount,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    stats: {
      completedCount: completed.length,
      totalPaidAmount,
    },
  });
}

