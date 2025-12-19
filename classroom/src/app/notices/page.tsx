import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { notices } from "@/app/notices/data";

function fmtDate(yyyyMmDd: string) {
  // "2025-12-18" -> "25.12.18"
  return yyyyMmDd.slice(2, 10).replace(/-/g, ".");
}

export default async function NoticesPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">공지사항</h1>

      <div className="mt-6 space-y-2">
        {notices.map((n) => (
          <Link
            key={n.slug}
            href={`/notices/${n.slug}`}
            className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{n.title}</p>
                <p className="mt-1 text-xs text-white/60">{fmtDate(n.createdAt)}</p>
              </div>
              <span className="shrink-0 text-xs text-white/60">보기</span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}


