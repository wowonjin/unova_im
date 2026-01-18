import AppShell from "@/app/_components/AppShell";
import { PageHeader, Card, CardBody, Button } from "@/app/_components/ui";
import { getCurrentUser, getTeacherAccountByUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import styles from "./TeacherProducts.module.scss";

export const dynamic = "force-dynamic";

function storeLink(type: "course" | "textbook", id: string) {
  // 스토어 상세는 id/slug 모두 받지만, 교재는 id 기반이 확실하므로 id로 고정
  return `/store/${encodeURIComponent(id)}`;
}

function formatWon(v: number) {
  return `${Math.max(0, Math.round(v)).toLocaleString("ko-KR")}원`;
}

function kstRangeUtc(kind: "all" | "day" | "week" | "month") {
  const now = new Date();
  if (kind === "all") return { startUtc: null as Date | null, endUtc: null as Date | null };
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

type SearchParams = {
  q?: string | string[];
  range?: string | string[];
  sort?: string | string[];
};

function firstParam(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === "string" ? first : "";
  }
  return "";
}

export default async function TeacherProductsPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fteacher%2Fproducts");
  const teacher = await getTeacherAccountByUserId(user.id);
  if (!teacher) {
    return (
      <AppShell>
        <PageHeader title="선생님 콘솔" description="이 계정은 아직 선생님 계정으로 연결되지 않았습니다." />
        <div className="mt-6">
          <Card className="bg-transparent border-white/10">
            <CardBody>
              <p className="text-sm text-white/70">관리자에게 선생님 계정 연결을 요청해주세요.</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/85">{user.email}</p>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  const sp = (await searchParams) ?? {};
  const q = firstParam((sp as any)?.q).trim();
  const rangeRaw = firstParam((sp as any)?.range).trim() || "all";
  const range = (["all", "day", "week", "month"].includes(rangeRaw) ? rangeRaw : "all") as "all" | "day" | "week" | "month";
  const sortRaw = firstParam((sp as any)?.sort).trim() || "revenue_desc";
  const sort = (
    ["revenue_desc", "count_desc", "updated_desc", "title_asc"].includes(sortRaw) ? sortRaw : "revenue_desc"
  ) as "revenue_desc" | "count_desc" | "updated_desc" | "title_asc";

  const [coursesAll, textbooksAll] = await Promise.all([
    prisma.course.findMany({
      where: { ownerId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, slug: true, isPublished: true, isSoldOut: true, reviewCount: true, rating: true },
      take: 100,
    }),
    prisma.textbook.findMany({
      where: { ownerId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, isPublished: true, isSoldOut: true, reviewCount: true, rating: true },
      take: 100,
    }),
  ]);

  const qNorm = q.toLowerCase();
  const courses = qNorm ? coursesAll.filter((c) => (c.title ?? "").toLowerCase().includes(qNorm)) : coursesAll;
  const textbooks = qNorm ? textbooksAll.filter((t) => (t.title ?? "").toLowerCase().includes(qNorm)) : textbooksAll;

  const rangeUtc = kstRangeUtc(range);
  const salesStatuses: OrderStatus[] = ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"];
  const [courseSales, textbookSales] = await Promise.all([
    prisma.order.groupBy({
      by: ["courseId"],
      where: {
        status: { in: salesStatuses },
        courseId: { not: null },
        course: { ownerId: user.id },
        ...(rangeUtc.startUtc && rangeUtc.endUtc ? { createdAt: { gte: rangeUtc.startUtc, lte: rangeUtc.endUtc } } : {}),
      },
      _count: { _all: true },
      _sum: { amount: true, refundedAmount: true },
    }),
    prisma.order.groupBy({
      by: ["textbookId"],
      where: {
        status: { in: salesStatuses },
        textbookId: { not: null },
        textbook: { ownerId: user.id },
        ...(rangeUtc.startUtc && rangeUtc.endUtc ? { createdAt: { gte: rangeUtc.startUtc, lte: rangeUtc.endUtc } } : {}),
      },
      _count: { _all: true },
      _sum: { amount: true, refundedAmount: true },
    }),
  ]);

  const courseSalesById = new Map<string, { count: number; revenue: number }>();
  for (const row of courseSales) {
    const id = row.courseId;
    if (!id) continue;
    const revenue = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    courseSalesById.set(id, { count: row._count._all ?? 0, revenue });
  }

  const textbookSalesById = new Map<string, { count: number; revenue: number }>();
  for (const row of textbookSales) {
    const id = row.textbookId;
    if (!id) continue;
    const revenue = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    textbookSalesById.set(id, { count: row._count._all ?? 0, revenue });
  }

  const sortItems = <T extends { id: string; title: string }>(items: T[], salesMap: Map<string, { count: number; revenue: number }>) => {
    const copy = [...items];
    const get = (id: string) => salesMap.get(id) ?? { count: 0, revenue: 0 };
    copy.sort((a, b) => {
      const sa = get(a.id);
      const sb = get(b.id);
      if (sort === "revenue_desc") return (sb.revenue - sa.revenue) || (sb.count - sa.count) || a.title.localeCompare(b.title, "ko");
      if (sort === "count_desc") return (sb.count - sa.count) || (sb.revenue - sa.revenue) || a.title.localeCompare(b.title, "ko");
      if (sort === "title_asc") return a.title.localeCompare(b.title, "ko");
      // updated_desc: 이미 쿼리 orderBy가 updated desc라 그대로 유지
      return 0;
    });
    return copy;
  };

  const coursesSorted = sort === "updated_desc" ? courses : sortItems(courses, courseSalesById);
  const textbooksSorted = sort === "updated_desc" ? textbooks : sortItems(textbooks, textbookSalesById);

  return (
    <AppShell>
      <PageHeader title="내 상품" description="스토어 링크와 기본 지표를 확인하세요." />

      <div className={`mt-6 ${styles.wrap}`}>
        <form action="/teacher/products" method="get" className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.seg} role="group" aria-label="기간 필터">
              <button type="submit" name="range" value="all" className={`${styles.segBtn} ${range === "all" ? styles.segBtnActive : ""}`}>
                전체
              </button>
              <button type="submit" name="range" value="day" className={`${styles.segBtn} ${range === "day" ? styles.segBtnActive : ""}`}>
                오늘
              </button>
              <button type="submit" name="range" value="week" className={`${styles.segBtn} ${range === "week" ? styles.segBtnActive : ""}`}>
                이번주
              </button>
              <button type="submit" name="range" value="month" className={`${styles.segBtn} ${range === "month" ? styles.segBtnActive : ""}`}>
                이번달
              </button>
            </div>
          </div>

          <div className={styles.toolbarRight}>
              <input className={styles.input} type="text" name="q" defaultValue={q} placeholder="상품명 검색" />
            <select className={styles.select} name="sort" defaultValue={sort} aria-label="정렬">
              <option value="revenue_desc">매출 높은 순</option>
              <option value="count_desc">판매횟수 많은 순</option>
              <option value="updated_desc">최근 수정 순</option>
              <option value="title_asc">이름 오름차순</option>
            </select>
          </div>
        </form>

        <p className="text-xs text-white/45">
          판매 횟수/매출은 주문 상태가 <span className="text-white/70 font-semibold">결제완료/부분환불/환불</span>인 주문을 기준으로 집계되며, 매출은{" "}
          <span className="text-white/70 font-semibold">환불 금액을 반영한 순매출</span>입니다. (기간:{" "}
          <span className="text-white/70 font-semibold">
            {range === "all" ? "전체" : range === "day" ? "오늘" : range === "week" ? "이번주" : "이번달"}
          </span>
          )
        </p>

        <div className={styles.grid}>
        <Card className={`${styles.panelCard} bg-transparent rounded-none border-white/10`}>
          <CardBody className="px-0 py-0">
            <div className={styles.panelHeader}>
              <p className={styles.panelTitle}>강좌</p>
              <p className={styles.panelMeta}>{coursesSorted.length.toLocaleString("ko-KR")}개</p>
            </div>

            {coursesSorted.length === 0 ? (
              <div className={styles.empty}>아직 내 강좌가 없습니다. 관리자에게 상품 할당을 요청하세요.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>상품</th>
                      <th className={`${styles.th} ${styles.right}`}>판매 횟수</th>
                      <th className={`${styles.th} ${styles.right}`}>총 매출액</th>
                      <th className={`${styles.th} ${styles.right}`}>링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesSorted.map((c) => {
                      const s = courseSalesById.get(c.id) ?? { count: 0, revenue: 0 };
                      return (
                        <tr key={c.id} className={styles.tr}>
                          <td className={styles.td}>
                            <div className={styles.name}>{c.title}</div>
                            <div className={styles.badgeRow}>
                              <span className={styles.badge}>
                                <span className={styles.badgeDot} aria-hidden="true" />
                                {c.isPublished ? "공개" : "비공개"}
                              </span>
                              <span className={styles.badge}>
                                <span className={styles.badgeDot} aria-hidden="true" />
                                {c.isSoldOut ? "준비중" : "판매중"}
                              </span>
                              <span className={styles.badge}>평점 {(c.rating ?? 0).toFixed(1)}</span>
                              <span className={styles.badge}>후기 {(c.reviewCount ?? 0).toLocaleString("ko-KR")}</span>
                            </div>
                          </td>
                          <td className={`${styles.td} ${styles.right}`}>{s.count.toLocaleString("ko-KR")}회</td>
                          <td className={`${styles.td} ${styles.right}`}>{formatWon(s.revenue)}</td>
                          <td className={`${styles.td} ${styles.right}`}>
                            <div className={styles.actions}>
                              <Button variant="secondary" href={storeLink("course", c.id)}>
                                링크
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className={`${styles.panelCard} bg-transparent rounded-none border-white/10`}>
          <CardBody className="px-0 py-0">
            <div className={styles.panelHeader}>
              <p className={styles.panelTitle}>교재</p>
              <p className={styles.panelMeta}>{textbooksSorted.length.toLocaleString("ko-KR")}개</p>
            </div>

            {textbooksSorted.length === 0 ? (
              <div className={styles.empty}>아직 내 교재가 없습니다. 관리자에게 상품 할당을 요청하세요.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>상품</th>
                      <th className={`${styles.th} ${styles.right}`}>판매 횟수</th>
                      <th className={`${styles.th} ${styles.right}`}>총 매출액</th>
                      <th className={`${styles.th} ${styles.right}`}>링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {textbooksSorted.map((t) => {
                      const s = textbookSalesById.get(t.id) ?? { count: 0, revenue: 0 };
                      return (
                        <tr key={t.id} className={styles.tr}>
                          <td className={styles.td}>
                            <div className={styles.name}>{t.title}</div>
                            <div className={styles.badgeRow}>
                              <span className={styles.badge}>
                                <span className={styles.badgeDot} aria-hidden="true" />
                                {t.isPublished ? "공개" : "비공개"}
                              </span>
                              <span className={styles.badge}>
                                <span className={styles.badgeDot} aria-hidden="true" />
                                {t.isSoldOut ? "준비중" : "판매중"}
                              </span>
                              <span className={styles.badge}>평점 {(t.rating ?? 0).toFixed(1)}</span>
                              <span className={styles.badge}>후기 {(t.reviewCount ?? 0).toLocaleString("ko-KR")}</span>
                            </div>
                          </td>
                          <td className={`${styles.td} ${styles.right}`}>{s.count.toLocaleString("ko-KR")}회</td>
                          <td className={`${styles.td} ${styles.right}`}>{formatWon(s.revenue)}</td>
                          <td className={`${styles.td} ${styles.right}`}>
                            <div className={styles.actions}>
                              <Button variant="secondary" href={storeLink("textbook", t.id)}>
                                링크
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
        </div>
      </div>
    </AppShell>
  );
}

