import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import AdminAnalyticsPanel from "./AdminAnalyticsPanel";
import type { AdminDailyMetrics } from "./AdminAnalyticsPanel";

function kstDateKey(d: Date): string {
  // YYYY-MM-DD in Asia/Seoul
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function kstStartOfDay(dateKey: string): Date {
  // dateKey: YYYY-MM-DD (KST)
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  // KST midnight -> UTC = -9h
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
}

function addDaysKst(dateKey: string, days: number): string {
  const base = kstStartOfDay(dateKey);
  // base is UTC timestamp of KST midnight
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return kstDateKey(next);
}

function rangeLast7DaysKst(now = new Date()): string[] {
  const today = kstDateKey(now);
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDaysKst(today, -i));
  return days;
}

export default async function AdminPage() {
  await requireAdminUser();

  const now = new Date();
  const days = rangeLast7DaysKst(now);
  const start7 = kstStartOfDay(days[0]!);
  const endTomorrow = kstStartOfDay(addDaysKst(days[days.length - 1]!, 1));

  // 이번달(KST) 범위
  const monthKey = kstDateKey(now).slice(0, 7); // YYYY-MM
  const monthStartKey = `${monthKey}-01`;
  const monthStart = kstStartOfDay(monthStartKey);
  const monthEnd = endTomorrow;

  // --- 방문자/페이지뷰 (OrderEvent: provider=web, eventType=pageview) ---
  const [pv7, pvMonth] = await Promise.all([
    prisma.orderEvent.findMany({
      where: { provider: "web", eventType: "pageview", receivedAt: { gte: start7, lt: endTomorrow } },
      select: { receivedAt: true, payload: true },
    }),
    prisma.orderEvent.findMany({
      where: { provider: "web", eventType: "pageview", receivedAt: { gte: monthStart, lt: monthEnd } },
      select: { receivedAt: true, payload: true },
    }),
  ]);

  // --- 기간별 분석용 데이터(7일) ---
  const [orders7, users7, qna7, reviews7] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: start7, lt: endTomorrow },
        status: { in: ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"] },
      },
      select: { createdAt: true, status: true, amount: true, refundedAmount: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: start7, lt: endTomorrow } },
      select: { createdAt: true },
    }),
    prisma.qnaPost.findMany({
      where: { createdAt: { gte: start7, lt: endTomorrow }, parentId: null },
      select: { createdAt: true },
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: start7, lt: endTomorrow }, isApproved: true },
      select: { createdAt: true },
    }),
  ]);

  // --- 이번달 합계 ---
  const [ordersMonth, usersMonthCount, qnaMonthCount, reviewsMonthCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        status: { in: ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"] },
      },
      select: { status: true, amount: true, refundedAmount: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.qnaPost.count({ where: { createdAt: { gte: monthStart, lt: monthEnd }, parentId: null } }),
    prisma.review.count({ where: { createdAt: { gte: monthStart, lt: monthEnd }, isApproved: true } }),
  ]);

  const init = (): Record<string, AdminDailyMetrics> =>
    Object.fromEntries(
      days.map((d) => [
        d,
        { date: d, pageViews: 0, visitors: 0, orders: 0, revenue: 0, signups: 0, inquiries: 0, reviews: 0 },
      ]),
    );

  const byDay = init();
  const visitorsSetByDay = new Map<string, Set<string>>();

  for (const ev of pv7) {
    const day = kstDateKey(ev.receivedAt);
    const bucket = byDay[day];
    if (!bucket) continue;
    bucket.pageViews += 1;
    const payload: any = ev.payload as any;
    const visitorId = typeof payload?.visitorId === "string" ? payload.visitorId : "";
    if (visitorId) {
      const set = visitorsSetByDay.get(day) ?? new Set<string>();
      set.add(visitorId);
      visitorsSetByDay.set(day, set);
    }
  }
  for (const d of days) {
    byDay[d]!.visitors = visitorsSetByDay.get(d)?.size ?? 0;
  }

  for (const o of orders7) {
    const day = kstDateKey(o.createdAt);
    const bucket = byDay[day];
    if (!bucket) continue;
    bucket.orders += 1;
    const refunded = typeof o.refundedAmount === "number" ? o.refundedAmount : 0;
    bucket.revenue += Math.max(0, (o.amount ?? 0) - refunded);
  }
  for (const u of users7) {
    const day = kstDateKey(u.createdAt);
    const bucket = byDay[day];
    if (bucket) bucket.signups += 1;
  }
  for (const q of qna7) {
    const day = kstDateKey(q.createdAt);
    const bucket = byDay[day];
    if (bucket) bucket.inquiries += 1;
  }
  for (const r of reviews7) {
    const day = kstDateKey(r.createdAt);
    const bucket = byDay[day];
    if (bucket) bucket.reviews += 1;
  }

  const daily = days.map((d) => byDay[d]!);

  // 합계 계산 (7일)
  const summary7 = daily.reduce(
    (acc, d) => {
      acc.orders += d.orders;
      acc.revenue += d.revenue;
      acc.pageViews += d.pageViews;
      acc.visitors += d.visitors;
      acc.signups += d.signups;
      acc.inquiries += d.inquiries;
      acc.reviews += d.reviews;
      return acc;
    },
    { orders: 0, revenue: 0, pageViews: 0, visitors: 0, signups: 0, inquiries: 0, reviews: 0 },
  );

  // 합계 계산 (이번달)
  const monthVisitors = new Set<string>();
  let monthPageViews = 0;
  for (const ev of pvMonth) {
    monthPageViews += 1;
    const payload: any = ev.payload as any;
    const visitorId = typeof payload?.visitorId === "string" ? payload.visitorId : "";
    if (visitorId) monthVisitors.add(visitorId);
  }
  const monthRevenue = ordersMonth.reduce((sum, o) => sum + Math.max(0, o.amount - (o.refundedAmount || 0)), 0);
  const summaryMonth = {
    orders: ordersMonth.length,
    revenue: monthRevenue,
    pageViews: monthPageViews,
    visitors: monthVisitors.size,
    signups: usersMonthCount,
    inquiries: qnaMonthCount,
    reviews: reviewsMonthCount,
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-[32px] font-bold tracking-tight">관리자 대시보드</h1>
        </div>

        {/* 방문자/기간별 분석 (실데이터 기반) */}
        <AdminAnalyticsPanel daily={daily} summary7={summary7} summaryMonth={summaryMonth} />
      </div>
    </AppShell>
  );
}
