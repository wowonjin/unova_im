import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody } from "@/app/_components/ui";
import { getCurrentUser, getTeacherAccountByUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import SalesPayoutChartClient from "./SalesPayoutChartClient";

export const dynamic = "force-dynamic";

function formatWon(v: number) {
  return `${Math.max(0, Math.round(v)).toLocaleString("ko-KR")}원`;
}

const CARD_FEE_RATE = 0.034; // 3.4%
const VAT_RATE = 0.1; // 부가세 10%
// NOTE:
// 여기서의 RATE는 "플랫폼 수수료율"이 아니라 "선생님 정산률"입니다.
// 예) 교재 25% 정산이면 정산액의 기본값은 (매출 * 0.25) 입니다.
const TEXTBOOK_PLATFORM_FEE_RATE = 0.25; // 교재 정산률 25%
const COURSE_PLATFORM_FEE_RATE = 0.5; // 강의 정산률 50%
const PDF_TEXTBOOK_PLATFORM_FEE_RATE = 0.5; // 전자책(PDF) 교재 정산률 50%
const SALES_STATUSES: OrderStatus[] = ["COMPLETED", "PARTIALLY_REFUNDED"];

function settleNetPayout(netSales: number, platformFeeRate: number) {
  const base = Math.max(0, netSales);
  const payoutBeforeFees = base * platformFeeRate;
  const cardFeeWithVat = base * CARD_FEE_RATE * (1 + VAT_RATE);
  return Math.max(0, payoutBeforeFees - cardFeeWithVat);
}

function normalizeTextbookType(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isPdfTextbook(tb: { textbookType?: string | null } | null | undefined) {
  // 요구사항: "PDF로 써져있는(=입력된) 것만" 전자책으로 집계
  // -> textbookType이 정확히 "PDF"인 항목만 전자책으로 처리
  return normalizeTextbookType(tb?.textbookType) === "PDF";
}

function payoutRateOfOrder(o: {
  productType: "COURSE" | "TEXTBOOK";
  textbook?: { composition?: string | null; textbookType?: string | null } | null;
}) {
  if (o.productType === "COURSE") return COURSE_PLATFORM_FEE_RATE;
  // TEXTBOOK: PDF 전자책은 50%, 그 외는 25%
  return isPdfTextbook(o.textbook) ? PDF_TEXTBOOK_PLATFORM_FEE_RATE : TEXTBOOK_PLATFORM_FEE_RATE;
}

function kstRangeUtc(kind: "day" | "week" | "month") {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  if (kind === "day") {
    const startUtcMs = Date.UTC(y, m, d, 0, 0, 0) - 9 * 60 * 60 * 1000;
    return { startUtc: new Date(startUtcMs), endUtc: now };
  }
  if (kind === "month") {
    const startUtcMs = Date.UTC(y, m, 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
    return { startUtc: new Date(startUtcMs), endUtc: now };
  }
  // week: KST 기준 월요일 00:00
  const weekday = kst.getUTCDay(); // 0=Sun..6=Sat (but here it's KST-day because we shifted)
  const diff = (weekday + 6) % 7; // Monday=0
  const startUtcMs = Date.UTC(y, m, d - diff, 0, 0, 0) - 9 * 60 * 60 * 1000;
  return { startUtc: new Date(startUtcMs), endUtc: now };
}

function kstPreviousMonthRangeUtc() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const currentMonthStartUtcMs = Date.UTC(y, m, 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
  const prevMonthStartUtcMs = Date.UTC(y, m - 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
  return {
    startUtc: new Date(prevMonthStartUtcMs),
    endUtc: new Date(currentMonthStartUtcMs - 1),
  };
}

function kstDateKey(dateUtc: Date) {
  const kst = new Date(dateUtc.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function kstLabelMD(dateUtc: Date) {
  const kst = new Date(dateUtc.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
}

function kstWeekdayKo(dateUtc: Date) {
  const kst = new Date(dateUtc.getTime() + 9 * 60 * 60 * 1000);
  const wd = kst.getUTCDay(); // 0=Sun..6=Sat (KST-day because we shifted)
  return ["일", "월", "화", "수", "목", "금", "토"][wd] ?? "";
}

function kstDateYmd(dateUtc: Date) {
  const kst = new Date(dateUtc.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function kstRangeLabel(startUtc: Date, endUtc: Date) {
  return `${kstDateYmd(startUtc)} ~ ${kstDateYmd(endUtc)}`;
}

function storeLink(type: "course" | "textbook", id: string, slug?: string | null) {
  // 스토어 상세는 id/slug 모두 받지만, 교재는 id 기반이 확실하므로 id로 고정
  if (type === "course") return `/store/${encodeURIComponent(slug?.trim() ? slug.trim() : id)}`;
  return `/store/${encodeURIComponent(id)}`;
}

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fteacher");
  const teacher = await getTeacherAccountByUserId(user.id);

  if (!teacher) {
    return (
      <AppShell>
        <PageHeader title="선생님 콘솔" description="이 계정은 아직 선생님 계정으로 연결되지 않았습니다." />
        <div className="mt-0">
          <Card className="bg-transparent">
            <CardBody>
              <p className="text-sm text-white/70">
                선생님 콘솔은 <span className="text-white font-semibold">관리자가 선생님 계정을 연결</span>한 뒤에 이용할 수 있습니다.
              </p>
              <p className="mt-2 text-sm text-white/60">
                관리자에게 아래 이메일로 <span className="text-white/80 font-semibold">선생님 계정 연결</span>을 요청해주세요.
              </p>
              <p className="mt-3 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/85">
                {user.email}
              </p>
              <a
                href="/api/auth/logout"
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06]"
              >
                로그아웃
              </a>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  const teacherName = (teacher.teacherName || "").trim();
  const [courseIds, textbookIds] = await Promise.all([
    teacherName.length
      ? prisma.course.findMany({ where: { teacherName }, select: { id: true }, take: 2000 }).then((xs) => xs.map((x) => x.id))
      : Promise.resolve([] as string[]),
    teacherName.length
      ? prisma.textbook.findMany({ where: { teacherName }, select: { id: true }, take: 2000 }).then((xs) => xs.map((x) => x.id))
      : Promise.resolve([] as string[]),
  ]);
  const coursesCount = courseIds.length;
  const textbooksCount = textbookIds.length;

  const day = kstRangeUtc("day");
  const week = kstRangeUtc("week");
  const month = kstRangeUtc("month");
  const lastMonth = kstPreviousMonthRangeUtc();
  const dayMs = 24 * 60 * 60 * 1000;
  const lastWeekStartUtc = new Date(week.startUtc.getTime() - 7 * dayMs);
  const lastWeekEndUtc = new Date(week.startUtc.getTime() - 1);

  const scopeOr: any[] = [];
  if (courseIds.length) scopeOr.push({ courseId: { in: courseIds } });
  if (textbookIds.length) scopeOr.push({ textbookId: { in: textbookIds } });
  const salesWhereBase = scopeOr.length
    ? ({ status: { in: SALES_STATUSES }, OR: scopeOr } as const)
    : ({ status: { in: SALES_STATUSES }, id: "__NO_MATCH__" } as const);

  async function summarizeRange(startUtc: Date, endUtc: Date) {
    const BATCH_SIZE = 1000;
    let cursorId: string | null = null;
    type OrderRow = Prisma.OrderGetPayload<{
      select: {
        id: true;
        productType: true;
        amount: true;
        refundedAmount: true;
        textbook: { select: { composition: true; textbookType: true } };
      };
    }>;
    let courseSales = 0;
    let ebookSales = 0; // PDF
    let textbookSales = 0; // non-PDF
    let payoutTotal = 0;
    let netSalesTotal = 0;
    let platformFeeTotal = 0; // 플랫폼 수수료(=총매출 - 정산기본액)
    let cardFeeWithVatTotal = 0;

    while (true) {
      const rows: OrderRow[] = await prisma.order.findMany({
        where: { ...salesWhereBase, createdAt: { gte: startUtc, lte: endUtc } },
        select: {
          id: true,
          productType: true,
          amount: true,
          refundedAmount: true,
          textbook: { select: { composition: true, textbookType: true } },
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });
      if (!rows.length) break;

      for (const o of rows) {
        const net = (o.amount ?? 0) - (o.refundedAmount ?? 0);
        const base = Math.max(0, net);
        netSalesTotal += base;
        if (o.productType === "COURSE") courseSales += net;
        if (o.productType === "TEXTBOOK") {
          if (isPdfTextbook(o.textbook)) ebookSales += net;
          else textbookSales += net;
        }
        const rate = payoutRateOfOrder({ productType: o.productType, textbook: o.textbook });
        const payoutBeforeFees = base * rate;
        const platformFee = base - payoutBeforeFees;
        const cardFeeWithVat = base * CARD_FEE_RATE * (1 + VAT_RATE);
        platformFeeTotal += platformFee;
        cardFeeWithVatTotal += cardFeeWithVat;
        payoutTotal += Math.max(0, payoutBeforeFees - cardFeeWithVat);
      }

      if (rows.length < BATCH_SIZE) break;
      cursorId = rows[rows.length - 1].id;
    }

    return { courseSales, ebookSales, textbookSales, payoutTotal, netSalesTotal, platformFeeTotal, cardFeeWithVatTotal };
  }

  const [daySum, weekSum, lastWeekSum, monthSum, lastMonthSum, reviewCount, reviews] = await Promise.all([
    summarizeRange(day.startUtc, day.endUtc),
    summarizeRange(week.startUtc, week.endUtc),
    summarizeRange(lastWeekStartUtc, lastWeekEndUtc),
    summarizeRange(month.startUtc, month.endUtc),
    summarizeRange(lastMonth.startUtc, lastMonth.endUtc),
    prisma.review.count({
      where: {
        isApproved: true,
        OR: [
          ...(courseIds.length ? [{ courseId: { in: courseIds } }] : []),
          ...(textbookIds.length ? [{ textbookId: { in: textbookIds } }] : []),
        ],
      },
    }),
    prisma.review.findMany({
      where: {
        isApproved: true,
        OR: [
          ...(courseIds.length ? [{ courseId: { in: courseIds } }] : []),
          ...(textbookIds.length ? [{ textbookId: { in: textbookIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        productType: true,
        authorName: true,
        rating: true,
        content: true,
        createdAt: true,
        course: { select: { title: true } },
        textbook: { select: { title: true } },
      },
    }),
  ]);

  const dayCourseSales = daySum.courseSales;
  const dayEbookSales = daySum.ebookSales;
  const dayTextbookSales = daySum.textbookSales;
  const weekCourseSales = weekSum.courseSales;
  const weekEbookSales = weekSum.ebookSales;
  const weekTextbookSales = weekSum.textbookSales;
  const lastWeekCourseSales = lastWeekSum.courseSales;
  const lastWeekEbookSales = lastWeekSum.ebookSales;
  const lastWeekTextbookSales = lastWeekSum.textbookSales;
  const monthCourseSales = monthSum.courseSales;
  const monthEbookSales = monthSum.ebookSales;
  const monthTextbookSales = monthSum.textbookSales;
  const lastMonthCourseSales = lastMonthSum.courseSales;
  const lastMonthEbookSales = lastMonthSum.ebookSales;
  const lastMonthTextbookSales = lastMonthSum.textbookSales;

  // NOTE: 교재는 PDF 여부에 따라 정산비가 달라서(25% vs 50%)
  // day/week/month 정산액은 aggregate가 아니라 "주문 단위"로 계산합니다.
  const dayPayoutTotal = daySum.payoutTotal;
  const weekPayoutTotal = weekSum.payoutTotal;
  const lastWeekPayoutTotal = lastWeekSum.payoutTotal;
  const monthPayoutTotal = monthSum.payoutTotal;
  const lastMonthPayoutTotal = lastMonthSum.payoutTotal;

  // 최근 21일(3주, 오늘 포함) 판매액 추이 (KST 기준 일자)
  const TREND_DAYS = 21;
  const now = new Date();
  const todayStartUtcMs = day.startUtc.getTime();
  const trendStartUtc = new Date(todayStartUtcMs - (TREND_DAYS - 1) * dayMs);

  // 베스트 판매 제품 TOP3 (전체 기간 기준, 판매액 우선/동률은 판매횟수)
  const salesStatuses: OrderStatus[] = ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"];
  const [courseSalesByCourse, textbookSalesByTextbook] = await Promise.all([
    prisma.order.groupBy({
      by: ["courseId"],
      where: {
        status: { in: salesStatuses },
        courseId: courseIds.length ? { in: courseIds } : { equals: "__NO_MATCH__" },
      },
      _count: { _all: true },
      _sum: { amount: true, refundedAmount: true },
    }),
    prisma.order.groupBy({
      by: ["textbookId"],
      where: {
        status: { in: salesStatuses },
        textbookId: textbookIds.length ? { in: textbookIds } : { equals: "__NO_MATCH__" },
      },
      _count: { _all: true },
      _sum: { amount: true, refundedAmount: true },
    }),
  ]);

  const bestRaw: Array<{ type: "course" | "textbook"; id: string; count: number; revenue: number }> = [];
  for (const row of courseSalesByCourse) {
    const id = row.courseId;
    if (!id) continue;
    const revenue = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    bestRaw.push({ type: "course", id, count: row._count._all ?? 0, revenue });
  }
  for (const row of textbookSalesByTextbook) {
    const id = row.textbookId;
    if (!id) continue;
    const revenue = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    bestRaw.push({ type: "textbook", id, count: row._count._all ?? 0, revenue });
  }
  bestRaw.sort((a, b) => (b.revenue !== a.revenue ? b.revenue - a.revenue : b.count - a.count));
  const bestTop3 = bestRaw.slice(0, 3);

  const courseIdsTop = bestTop3.filter((x) => x.type === "course").map((x) => x.id);
  const textbookIdsTop = bestTop3.filter((x) => x.type === "textbook").map((x) => x.id);
  const [coursesTop, textbooksTop] = await Promise.all([
    courseIdsTop.length
      ? prisma.course.findMany({ where: { id: { in: courseIdsTop } }, select: { id: true, title: true, slug: true } })
      : Promise.resolve([]),
    textbookIdsTop.length
      ? prisma.textbook.findMany({ where: { id: { in: textbookIdsTop } }, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);
  const courseTopById = new Map(coursesTop.map((c) => [c.id, c]));
  const textbookTopById = new Map(textbooksTop.map((t) => [t.id, t]));

  const recentOrders = await prisma.order.findMany({
    where: {
      ...salesWhereBase,
      createdAt: { gte: trendStartUtc, lte: now },
    },
    select: {
      productType: true,
      amount: true,
      refundedAmount: true,
      createdAt: true,
      textbook: { select: { composition: true, textbookType: true } },
    },
    take: 5000,
    orderBy: { createdAt: "asc" },
  });

  const trendKeys: string[] = [];
  const trendLabels: string[] = [];
  const trendWeekdays: string[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const dayStart = new Date(todayStartUtcMs - i * dayMs);
    trendKeys.push(kstDateKey(dayStart));
    trendLabels.push(kstLabelMD(dayStart));
    trendWeekdays.push(kstWeekdayKo(dayStart));
  }

  const sumCourseByDay = new Map<string, number>();
  const sumEbookByDay = new Map<string, number>();
  const sumTextbookByDay = new Map<string, number>();
  const payoutByDayAccurate = new Map<string, number>();
  for (const o of recentOrders) {
    const key = kstDateKey(o.createdAt);
    const net = (o.amount ?? 0) - (o.refundedAmount ?? 0);
    if (o.productType === "COURSE") {
      sumCourseByDay.set(key, (sumCourseByDay.get(key) ?? 0) + net);
    } else if (o.productType === "TEXTBOOK") {
      if (isPdfTextbook(o.textbook)) sumEbookByDay.set(key, (sumEbookByDay.get(key) ?? 0) + net);
      else sumTextbookByDay.set(key, (sumTextbookByDay.get(key) ?? 0) + net);
    }
    const rate = payoutRateOfOrder({ productType: o.productType, textbook: o.textbook });
    payoutByDayAccurate.set(key, (payoutByDayAccurate.get(key) ?? 0) + settleNetPayout(net, rate));
  }
  const trendCourseSalesValues = trendKeys.map((k) => sumCourseByDay.get(k) ?? 0);
  const trendEbookSalesValues = trendKeys.map((k) => sumEbookByDay.get(k) ?? 0);
  const trendTextbookSalesValues = trendKeys.map((k) => sumTextbookByDay.get(k) ?? 0);
  const trendSalesValues = trendKeys.map(
    (_, i) => (trendCourseSalesValues[i] ?? 0) + (trendEbookSalesValues[i] ?? 0) + (trendTextbookSalesValues[i] ?? 0)
  );
  const trendPayoutValues = trendKeys.map((k) => payoutByDayAccurate.get(k) ?? 0);

  const salesRows = [
    {
      key: "today",
      label: "오늘",
      range: kstRangeLabel(day.startUtc, day.endUtc),
      textbook: dayTextbookSales,
      ebook: dayEbookSales,
      course: dayCourseSales,
    },
    {
      key: "week",
      label: "이번주",
      range: kstRangeLabel(week.startUtc, week.endUtc),
      textbook: weekTextbookSales,
      ebook: weekEbookSales,
      course: weekCourseSales,
    },
    {
      key: "lastWeek",
      label: "저번주",
      range: kstRangeLabel(lastWeekStartUtc, lastWeekEndUtc),
      textbook: lastWeekTextbookSales,
      ebook: lastWeekEbookSales,
      course: lastWeekCourseSales,
    },
    {
      key: "month",
      label: "이번달",
      range: kstRangeLabel(month.startUtc, month.endUtc),
      textbook: monthTextbookSales,
      ebook: monthEbookSales,
      course: monthCourseSales,
    },
    {
      key: "lastMonth",
      label: "저번달",
      range: kstRangeLabel(lastMonth.startUtc, lastMonth.endUtc),
      textbook: lastMonthTextbookSales,
      ebook: lastMonthEbookSales,
      course: lastMonthCourseSales,
    },
  ] as const;

  const payoutRows = [
    {
      key: "today",
      label: "오늘",
      payout: dayPayoutTotal,
      range: kstRangeLabel(day.startUtc, day.endUtc),
      netSalesTotal: daySum.netSalesTotal,
      platformFeeTotal: daySum.platformFeeTotal,
      cardFeeWithVatTotal: daySum.cardFeeWithVatTotal,
    },
    {
      key: "week",
      label: "이번주",
      payout: weekPayoutTotal,
      range: kstRangeLabel(week.startUtc, week.endUtc),
      netSalesTotal: weekSum.netSalesTotal,
      platformFeeTotal: weekSum.platformFeeTotal,
      cardFeeWithVatTotal: weekSum.cardFeeWithVatTotal,
    },
    {
      key: "lastWeek",
      label: "저번주",
      payout: lastWeekPayoutTotal,
      range: kstRangeLabel(lastWeekStartUtc, lastWeekEndUtc),
      netSalesTotal: lastWeekSum.netSalesTotal,
      platformFeeTotal: lastWeekSum.platformFeeTotal,
      cardFeeWithVatTotal: lastWeekSum.cardFeeWithVatTotal,
    },
    {
      key: "month",
      label: "이번달",
      payout: monthPayoutTotal,
      range: kstRangeLabel(month.startUtc, month.endUtc),
      netSalesTotal: monthSum.netSalesTotal,
      platformFeeTotal: monthSum.platformFeeTotal,
      cardFeeWithVatTotal: monthSum.cardFeeWithVatTotal,
    },
    {
      key: "lastMonth",
      label: "저번달",
      payout: lastMonthPayoutTotal,
      range: kstRangeLabel(lastMonth.startUtc, lastMonth.endUtc),
      netSalesTotal: lastMonthSum.netSalesTotal,
      platformFeeTotal: lastMonthSum.platformFeeTotal,
      cardFeeWithVatTotal: lastMonthSum.cardFeeWithVatTotal,
    },
  ] as const;

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="bg-transparent">
          <CardBody>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white/60">판매액 (KST)</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="w-full overflow-hidden rounded-xl border border-white/10">
                <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] bg-white/[0.03] px-3 py-2 text-[11px] text-white/55">
                  <div className="font-medium whitespace-nowrap">기간</div>
                  <div className="text-right font-medium whitespace-nowrap">교재</div>
                  <div className="text-right font-medium whitespace-nowrap">전자책</div>
                  <div className="text-right font-medium whitespace-nowrap">강의</div>
                </div>
                <div className="divide-y divide-white/10">
                  {salesRows.map((r) => (
                    <div
                      key={r.key}
                      className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] text-white/55 whitespace-nowrap">{r.label}</div>
                        <div className="mt-0.5 text-[10px] text-white/35 whitespace-nowrap">{r.range}</div>
                      </div>
                      <div className="text-right text-[13px] font-semibold text-white tabular-nums whitespace-nowrap">
                        {formatWon(r.textbook)}
                      </div>
                      <div className="text-right text-[13px] font-semibold text-white tabular-nums whitespace-nowrap">
                        {formatWon(r.ebook)}
                      </div>
                      <div className="text-right text-[13px] font-semibold text-white tabular-nums whitespace-nowrap">
                        {formatWon(r.course)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between gap-3 rounded-t-xl bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] font-medium text-white/55">토탈 예상 정산액</p>
                <p className="text-[11px] text-white/45">정산비/카드수수료 반영</p>
              </div>
              <div className="divide-y divide-white/10">
                {payoutRows.map((r) => (
                  <div key={r.key} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[12px] text-white/55 whitespace-nowrap">{r.label}</span>
                      <span className="mt-0.5 block text-[10px] text-white/35 whitespace-nowrap">{r.range}</span>
                    </span>
                    <span className="relative inline-flex justify-end tabular-nums group">
                      <span className="text-[13px] font-semibold text-white/90 whitespace-nowrap">
                        {formatWon(r.payout)}
                      </span>
                      <span className="pointer-events-none absolute right-0 top-0 z-[9999] hidden w-[280px] -translate-y-[calc(100%+10px)] rounded-xl border border-white/10 bg-[#1d1d1f] px-3 py-2 text-[11px] text-white/80 shadow-lg group-hover:block">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white/90">정산 계산</span>
                          <span className="text-white/50">{r.label}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-white/40">{r.range}</div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-white/60">총 매출</span>
                            <span className="font-semibold text-white/90 tabular-nums">{formatWon(r.netSalesTotal)}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-white/60">플랫폼 수수료(차감)</span>
                            <span className="font-semibold text-white/90 tabular-nums">-{formatWon(r.platformFeeTotal)}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-white/60">카드 수수료(VAT 포함)</span>
                            <span className="font-semibold text-white/90 tabular-nums">-{formatWon(r.cardFeeWithVatTotal)}</span>
                          </div>
                          <div className="mt-1 border-t border-white/10 pt-1.5 flex items-baseline justify-between gap-3">
                            <span className="text-white/70">예상 정산액</span>
                            <span className="font-semibold text-white tabular-nums">{formatWon(r.payout)}</span>
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-white/45 leading-relaxed">
                          정산률: 교재 {Math.round(TEXTBOOK_PLATFORM_FEE_RATE * 100)}% · PDF {Math.round(PDF_TEXTBOOK_PLATFORM_FEE_RATE * 100)}% · 강의{" "}
                          {Math.round(COURSE_PLATFORM_FEE_RATE * 100)}% / 카드 {Math.round(CARD_FEE_RATE * 1000) / 10}% + VAT {Math.round(VAT_RATE * 100)}%
                        </p>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer select-none text-[11px] text-white/45 hover:text-white/70">
                정산 기준 보기
              </summary>
              <div className="mt-2 text-[11px] text-white/45 leading-relaxed">
                <p>
                  정산률: 교재 {Math.round(TEXTBOOK_PLATFORM_FEE_RATE * 100)}% (PDF {Math.round(PDF_TEXTBOOK_PLATFORM_FEE_RATE * 100)}%) ·
                  강의 {Math.round(COURSE_PLATFORM_FEE_RATE * 100)}%
                </p>
                <p className="mt-1">
                  카드 수수료:{" "}
                  <a
                    href="https://www.tosspayments.com/about/fee"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/70 underline underline-offset-2 hover:text-white"
                  >
                    {Math.round(CARD_FEE_RATE * 1000) / 10}% (VAT 별도)
                  </a>
                </p>
              </div>
            </details>
          </CardBody>
        </Card>
        <Card className="bg-transparent">
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white/60">내 상품</p>
              <p className="text-sm text-white/60">
                강좌 {coursesCount} · 교재 {textbooksCount}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs text-white/45">베스트 판매 제품 TOP 3</p>
              <div className="mt-2 space-y-2">
                {bestTop3.length > 0 ? (
                  bestTop3.map((p) => {
                    const meta = p.type === "course" ? courseTopById.get(p.id) : textbookTopById.get(p.id);
                    const title = meta?.title ?? (p.type === "course" ? "강좌" : "교재");
                    const href = storeLink(p.type, p.id, p.type === "course" ? (meta as any)?.slug : null);
                    return (
                      <a
                        key={`${p.type}-${p.id}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-white/10 bg-transparent p-3 hover:bg-white/[0.03] transition-colors"
                        title="스토어 상세 열기"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white/90">
                              <span className="mr-2 text-[12px] font-semibold text-white/55">
                                {p.type === "course" ? "강좌" : "교재"}
                              </span>
                              {title}
                            </p>
                            <p className="mt-1 text-[12px] text-white/55">판매횟수 {p.count}회</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[12px] text-white/50">판매액</p>
                            <p className="text-sm font-semibold text-white/90">{formatWon(p.revenue)}</p>
                          </div>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-white/10 bg-transparent p-3 text-sm text-white/60">
                    아직 판매 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-transparent">
          <CardBody>
            <p className="text-sm text-white/60">작성된 리뷰</p>
            <p className="mt-1 text-sm text-white/50">총 {reviewCount}개</p>

            <div className="mt-3 max-h-[260px] overflow-y-auto pr-1">
              {reviews.length > 0 ? (
                <div className="space-y-2">
                  {reviews.map((r) => {
                    const productTitle = r.productType === "COURSE" ? r.course?.title : r.textbook?.title;
                    const stars = "★★★★★".slice(0, Math.max(0, Math.min(5, r.rating || 0)));
                    const kstCreatedAt = new Date(r.createdAt.getTime() + 9 * 60 * 60 * 1000);
                    const kstCreatedLabel = kstCreatedAt.toLocaleDateString("ko-KR");
                    return (
                      <div key={r.id} className="rounded-xl border border-white/10 bg-transparent p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white/90">
                              {productTitle ?? "상품"} <span className="text-white/40 font-normal">· {r.authorName}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-white/60">{kstCreatedLabel}</p>
                          </div>
                          <div className="shrink-0 text-sm text-amber-200">{stars}</div>
                        </div>
                        <p
                          className="mt-2 text-[13px] text-white/70"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {r.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">아직 작성된 리뷰가 없습니다.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 판매/정산 그래프 (3개 카드 아래) */}
      <div className="mt-3">
        <Card className="bg-transparent">
          <CardBody className="py-3">
            <SalesPayoutChartClient
              labels={trendLabels}
              weekdays={trendWeekdays}
              salesValues={trendSalesValues}
              payoutValues={trendPayoutValues}
            />
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

