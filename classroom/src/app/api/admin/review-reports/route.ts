import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const url = new URL(req.url);
  const take = Math.max(1, Math.min(300, Number(url.searchParams.get("take") || 200)));

  const reports = await prisma.reviewReport.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      reason: true,
      detail: true,
      createdAt: true,
      visitorId: true,
      user: { select: { id: true, email: true, name: true } },
      review: {
        select: {
          id: true,
          productType: true,
          courseId: true,
          textbookId: true,
          authorName: true,
          rating: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      detail: r.detail,
      createdAt: r.createdAt.toISOString(),
      reporter: r.user
        ? { type: "user", email: r.user.email, name: r.user.name }
        : { type: "visitor", visitorId: r.visitorId },
      review: {
        id: r.review.id,
        productType: r.review.productType,
        productId: r.review.productType === "COURSE" ? r.review.courseId : r.review.textbookId,
        authorName: r.review.authorName,
        rating: r.review.rating,
        content: r.review.content,
        createdAt: r.review.createdAt.toISOString(),
      },
    })),
  });
}

