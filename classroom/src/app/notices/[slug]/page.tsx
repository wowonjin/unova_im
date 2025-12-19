import Link from "next/link";
import AppShell from "@/app/_components/AppShell";
import { notices } from "@/app/notices/data";

function fmtDate(yyyyMmDd: string) {
  return yyyyMmDd.slice(2, 10).replace(/-/g, ".");
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const notice = notices.find((n) => n.slug === slug) ?? null;

  if (!notice) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/80">공지사항을 찾을 수 없습니다.</p>
          <Link href="/notices" className="mt-4 inline-block underline text-white/80">
            공지사항 목록으로
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/notices" className="text-sm text-white/70 underline">
        ← 공지사항
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{notice.title}</h1>
      <p className="mt-1 text-sm text-white/60">{fmtDate(notice.createdAt)}</p>

      <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/90">
        {notice.body}
      </div>
    </AppShell>
  );
}


