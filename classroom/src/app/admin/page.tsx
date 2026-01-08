import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminAnalyticsPanel from "./AdminAnalyticsPanel";
import type { AdminDailyMetrics } from "./AdminAnalyticsPanel";

const adminMenus = [
  {
    title: "메인페이지 설정",
    description: "메인 슬라이드/바로가기 아이콘 관리",
    href: "/admin/home",
    icon: "tune",
    color: "from-fuchsia-500/20 to-fuchsia-600/20",
    iconColor: "text-fuchsia-300",
  },
  {
    title: "교재 관리",
    description: "교재 업로드, 공개 설정, 다운로드 관리",
    href: "/admin/textbooks",
    icon: "menu_book",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-400",
  },
  {
    title: "강좌 관리",
    description: "강좌 생성, 차시 관리, 공개 설정",
    href: "/admin/courses",
    icon: "video_library",
    color: "from-purple-500/20 to-purple-600/20",
    iconColor: "text-purple-400",
  },
  {
    title: "회원 관리",
    description: "전체 회원 목록, 수강 현황, 권한 관리",
    href: "/admin/members",
    icon: "group",
    color: "from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-400",
  },
  {
    title: "주문 관리",
    description: "결제된 주문 목록, 주문 상태 관리",
    href: "/admin/orders",
    icon: "receipt_long",
    color: "from-rose-500/20 to-rose-600/20",
    iconColor: "text-rose-400",
  },
  {
    title: "팝업 관리",
    description: "메인페이지 팝업 등록 및 관리",
    href: "/admin/popups",
    icon: "web_asset",
    color: "from-cyan-500/20 to-cyan-600/20",
    iconColor: "text-cyan-400",
  },
  {
    title: "후기 관리",
    description: "전체 후기 목록 확인 및 삭제",
    href: "/admin/reviews",
    icon: "rate_review",
    color: "from-indigo-500/20 to-indigo-600/20",
    iconColor: "text-indigo-300",
  },
  {
    title: "선생님 관리",
    description: "Teachers 페이지에 노출할 선생님 목록 관리",
    href: "/admin/teachers",
    icon: "badge",
    color: "from-slate-500/20 to-slate-600/20",
    iconColor: "text-slate-300",
  },
];

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
          <p className="mt-2 text-white/50">유노바 강의실 관리 페이지입니다.</p>
        </div>

        {/* 방문자/기간별 분석 (실데이터 기반) */}
        <AdminAnalyticsPanel daily={daily} summary7={summary7} summaryMonth={summaryMonth} />

        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminMenus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="group p-6 rounded-2xl bg-gradient-to-br border border-white/[0.06] transition-all hover:border-white/[0.12] hover:scale-[1.02]"
              style={{
                backgroundImage: `linear-gradient(to bottom right, ${menu.color.split(" ")[0].replace("from-", "")}, ${menu.color.split(" ")[1].replace("to-", "")})`,
              }}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4`}
              >
                <span
                  className={`material-symbols-outlined ${menu.iconColor}`}
                  style={{ fontSize: "24px" }}
                >
                  {menu.icon}
                </span>
              </div>
              <h3 className="text-[18px] font-semibold text-white group-hover:text-white/90">
                {menu.title}
              </h3>
              <p className="mt-1 text-[14px] text-white/50">{menu.description}</p>
            </Link>
          ))}
                  </div>
      </div>
    </AppShell>
  );
}
