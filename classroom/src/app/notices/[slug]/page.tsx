import Link from "next/link";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

function fmtDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    // ignore
  }
  slug = slug.normalize("NFC");
  const user = await getCurrentUser();

  const notice = await prisma.notice.findFirst({
    where: { slug, ...(user?.isAdmin ? {} : { isPublished: true }) },
    select: { id: true, title: true, body: true, category: true, createdAt: true },
  });

  if (!notice) {
    return (
      <div className="min-h-screen bg-[#161616] text-white flex flex-col">
        <LandingHeader />
        <main className="flex-1 pt-[70px]">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-white/[0.04]">
                <span className="material-symbols-outlined text-[32px] text-white/30">error_outline</span>
              </div>
              <p className="mt-6 text-lg font-medium text-white/60">공지사항을 찾을 수 없습니다</p>
              <Link 
                href="/notices" 
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                목록으로 돌아가기
          </Link>
        </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 이전글/다음글 조회
  const [prevNotice, nextNotice] = await Promise.all([
    prisma.notice.findFirst({
      where: {
        createdAt: { lt: notice.createdAt },
        ...(user?.isAdmin ? {} : { isPublished: true }),
      },
      orderBy: { createdAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.notice.findFirst({
      where: {
        createdAt: { gt: notice.createdAt },
        ...(user?.isAdmin ? {} : { isPublished: true }),
      },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 pt-[70px]">
        {/* 컨텐츠 영역 */}
        <article className="py-12">
          <div className="mx-auto max-w-3xl px-4">
            {/* 뒤로가기 */}
        <Link
          href="/notices"
              className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors mb-8"
        >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              목록으로
        </Link>

            {/* 헤더 */}
            <header className="border-b border-white/10 pb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-white/70">
                  {notice.category}
                </span>
      </div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {notice.title}
              </h1>
              <p className="mt-4 text-sm text-white/40">
                {fmtDate(notice.createdAt)}
              </p>
            </header>

            {/* 본문 */}
        <div
              className="py-10 text-[15px] leading-[1.8] text-white/85
                [&_p]:my-4
                [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold
                [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold
                [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold
                [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2
                [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2
                [&_li]:text-white/80
                [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-5 [&_blockquote]:py-1 [&_blockquote]:text-white/70 [&_blockquote]:italic
                [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-blue-300
                [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-xl
                [&_pre]:my-6 [&_pre]:rounded-xl [&_pre]:bg-white/[0.04] [&_pre]:p-4 [&_pre]:overflow-x-auto
                [&_code]:text-sm [&_code]:text-amber-400
                [&_hr]:my-8 [&_hr]:border-white/10"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: notice.body }}
        />

            {/* 이전글/다음글 */}
            <nav className="border-t border-white/10 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prevNotice ? (
                  <Link
                    href={`/notices/${prevNotice.slug}`}
                    className="group flex items-center gap-4 rounded-xl border border-white/10 p-5 transition-colors hover:border-white/20 hover:bg-white/[0.02]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/40 group-hover:text-white/60">
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-white/40 mb-1">이전글</p>
                      <p className="truncate text-sm font-medium text-white/70 group-hover:text-white/90">
                        {prevNotice.title}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                {nextNotice ? (
                  <Link
                    href={`/notices/${nextNotice.slug}`}
                    className="group flex items-center justify-end gap-4 rounded-xl border border-white/10 p-5 transition-colors hover:border-white/20 hover:bg-white/[0.02] text-right"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-white/40 mb-1">다음글</p>
                      <p className="truncate text-sm font-medium text-white/70 group-hover:text-white/90">
                        {nextNotice.title}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/40 group-hover:text-white/60">
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </div>

              {/* 목록 버튼 */}
              <div className="mt-8 text-center">
                <Link
                  href="/notices"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">list</span>
                  목록으로
                </Link>
              </div>
            </nav>
          </div>
        </article>
      </main>
      
      <Footer />
      </div>
  );
}
