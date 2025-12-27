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
  const since = url.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;
  const sinceValid = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : null;

  const where = sinceValid
    ? {
        OR: [{ createdAt: { gt: sinceValid } }, { updatedAt: { gt: sinceValid } }],
      }
    : {};

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      productType: true,
      courseId: true,
      textbookId: true,
      authorName: true,
      rating: true,
      content: true,
      imageUrls: true,
      isApproved: true,
      createdAt: true,
      updatedAt: true,
      course: { select: { id: true, title: true } },
      textbook: { select: { id: true, title: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    reviews: reviews.map((r) => ({
      id: r.id,
      productType: r.productType,
      productId: r.productType === "COURSE" ? r.courseId : r.textbookId,
      productTitle: r.productType === "COURSE" ? r.course?.title ?? "강좌" : r.textbook?.title ?? "교재",
      authorName: r.authorName,
      rating: r.rating,
      content: r.content,
      imageUrls: (r.imageUrls as string[] | null) ?? [],
      isApproved: r.isApproved,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user
        ? { id: r.user.id, email: r.user.email, name: r.user.name }
        : null,
    })),
  });
}


