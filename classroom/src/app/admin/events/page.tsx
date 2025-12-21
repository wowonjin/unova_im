import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, CardHeader, Field, HelpTip, Input } from "@/app/_components/ui";

export default async function AdminEventsPage() {
  await requireAdminUser();

  const events = await prisma.orderEvent.findMany({
    where: { provider: "imweb" },
    orderBy: { receivedAt: "desc" },
    take: 50,
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">웹훅/주문 이벤트 로그</h1>
      <p className="mt-1 text-sm text-white/70">최근 50개 수신 내역입니다.</p>

      <div className="mt-6">
        <Card className="bg-transparent">
          <CardHeader title="수동 주문 동기화" description="아임웹 주문번호로 강좌/교재 권한을 재동기화합니다." />
          <CardBody>
            <form className="grid grid-cols-1 gap-3 md:grid-cols-12" action="/api/admin/imweb/sync-order" method="post">
              <div className="md:col-span-8">
                <Field
                  label={
                    <span className="inline-flex items-center">
                      주문번호(order_no)
                      <HelpTip text="자동 발급이 누락됐을 때, 아임웹 주문번호를 넣고 다시 동기화하는 기능입니다. 보통 웹훅 설정이 안 되었거나, 일시적인 오류가 있을 때 사용합니다." />
                    </span>
                  }
                  hint="예: 20251220-000123"
                >
                  <Input name="orderNo" placeholder="예: 20251220-000123" className="bg-transparent" />
                </Field>
              </div>
              <div className="md:col-span-4 flex items-end justify-end">
                <Button type="submit">동기화</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold">Imweb OrderEvent</h2>
        </div>
        <ul className="divide-y divide-white/10">
          {events.map((e) => (
            <li key={e.id} className="px-5 py-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {e.eventType} · order_no: <span className="font-mono">{e.orderNo ?? "-"}</span>
                  </p>
                  <p className="text-xs text-white/70">
                    receivedAt: {e.receivedAt.toISOString()} · processedAt:{" "}
                    {e.processedAt ? e.processedAt.toISOString() : "-"}
                  </p>
                  {e.processingError ? (
                    <p className="mt-1 text-xs text-red-600">error: {e.processingError}</p>
                  ) : null}
                </div>

                {/* 수동 재동기화 버튼 제거: 웹훅 기반 자동 연동을 전제로 운영 */}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}


