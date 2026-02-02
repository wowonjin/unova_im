import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  return null;
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return Boolean(value) && typeof value === "object" && typeof (value as any).then === "function";
}

export default async function SubscriptionBillingFailPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  await requireAdminUser();

  const sp: SearchParams = isPromiseLike<SearchParams>(searchParams) ? await searchParams : (searchParams ?? {});
  const code = firstString(sp.code) ?? "UNKNOWN";
  const message = firstString(sp.message) ?? "카드 등록이 실패했습니다.";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-[24px] font-bold">카드 등록 실패</h1>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          {message} (code: {code})
        </div>
        <Link
          href="/admin/subscription-test"
          className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          테스트 페이지로 돌아가기
        </Link>
      </div>
    </AppShell>
  );
}
