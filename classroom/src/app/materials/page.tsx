import AppShell from "@/app/_components/AppShell";
import PdfFirstPageThumb from "@/app/_components/PdfFirstPageThumb";
import { getCurrentUserOrGuest } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function MaterialsPage() {
  const user = await getCurrentUserOrGuest();
  const now = new Date();

  // 교재: 이용자 목록(Entitlement)에 있는 사용자만 볼 수 있음
  // 로그인하지 않으면 교재 목록 비움
  let textbooks: {
    id: string;
    title: string;
    originalName: string;
    createdAt: Date;
    imwebProdCode: string | null;
    thumbnailUrl: string | null;
  }[] = [];

  if (user.isLoggedIn && user.id) {
    // 현재 사용자의 활성 권한이 있는 교재 ID 가져오기
    const entitlements = await prisma.textbookEntitlement.findMany({
      where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
      select: { textbookId: true },
    });
    const entitledIds = entitlements.map((e) => e.textbookId);

    if (entitledIds.length > 0) {
      textbooks = await prisma.textbook.findMany({
        where: { 
          isPublished: true,
          id: { in: entitledIds },
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          originalName: true,
          createdAt: true,
          imwebProdCode: true,
          thumbnailUrl: true,
        },
      });
    }
  }

  const enrollments = user.id
    ? await prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
        select: { courseId: true, course: { select: { id: true, title: true } } },
        orderBy: { endAt: "asc" },
      })
    : [];

  const courseIds = enrollments.map((e) => e.courseId);

  const attachments = courseIds.length > 0
    ? await prisma.attachment.findMany({
        where: {
          OR: [
            { courseId: { in: courseIds } },
            { lesson: { courseId: { in: courseIds } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: { lesson: { select: { id: true, title: true, position: true, courseId: true } } },
      })
    : [];

  const courseTitleById = new Map(enrollments.map((e) => [e.course.id, e.course.title]));

  const totalMaterials = textbooks.length + attachments.length;

  return (
    <AppShell>
      {/* 헤더 카드 */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-transparent p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08]">
            <span className="material-symbols-outlined text-[22px] text-white/70">menu_book</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">교재 다운로드</h1>
            <p className="mt-0.5 text-sm text-white/50">
              {totalMaterials > 0 ? (
                <>총 <span className="font-medium text-white/70">{totalMaterials}개</span>의 자료를 다운로드할 수 있습니다</>
              ) : (
                "다운로드 가능한 자료가 없습니다"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 교재 섹션 */}
      {textbooks.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-white/40">book</span>
            <h2 className="text-sm font-medium text-white/60">교재</h2>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-medium text-white/50">
              {textbooks.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {textbooks.map((t) => (
              <div
                key={t.id}
                className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1c] transition-colors hover:border-white/[0.12] hover:bg-[#1e1e20]"
              >
                <div className="flex gap-4 p-4">
                  {/* PDF 썸네일 - A4 비율 (1:1.414) */}
                  <div className="relative w-[68px] shrink-0 overflow-hidden rounded-lg bg-white/[0.04]" style={{ aspectRatio: '1 / 1.414' }}>
                    {t.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.thumbnailUrl}
                        alt={`${t.title} 미리보기`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PdfFirstPageThumb
                        src={`/api/textbooks/${t.id}/view`}
                        title={t.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10" />
                  </div>
                  {/* 정보 */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-white">
                        {t.title}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/40">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        <span className="truncate">{t.originalName}</span>
                      </p>
                    </div>
                    <a
                      href={`/api/textbooks/${t.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      다운로드
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 강좌 첨부파일 섹션 */}
      {attachments.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-white/40">attach_file</span>
            <h2 className="text-sm font-medium text-white/60">강좌 자료</h2>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-medium text-white/50">
              {attachments.length}
            </span>
          </div>
          <div className="space-y-2">
            {attachments.map((a) => {
              const courseId = a.courseId ?? a.lesson?.courseId ?? "";
              const courseTitle = courseTitleById.get(courseId) ?? "강좌";
              const lessonLabel = a.lesson ? `${a.lesson.position}강 · ${a.lesson.title}` : "공통 자료";
              const isPdf = a.originalName?.toLowerCase().endsWith(".pdf");
              
              return (
                <div
                  key={a.id}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#1a1a1c] p-4 transition-colors hover:border-white/[0.12] hover:bg-[#1e1e20]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPdf ? "bg-red-500/10" : "bg-white/[0.06]"}`}>
                      <span className={`material-symbols-outlined text-[20px] ${isPdf ? "text-red-400" : "text-white/50"}`}>
                        {isPdf ? "picture_as_pdf" : "draft"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{a.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                        <span className="truncate">{courseTitle}</span>
                        <span className="text-white/20">·</span>
                        <span className="truncate">{lessonLabel}</span>
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/attachments/${a.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span className="hidden sm:inline">다운로드</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {totalMaterials === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <span className="material-symbols-outlined text-[32px] text-white/30">
              {user.isLoggedIn ? "folder_off" : "login"}
            </span>
          </div>
          {!user.isLoggedIn ? (
            <>
              <p className="mt-4 text-sm font-medium text-white/60">로그인이 필요합니다</p>
              <p className="mt-1 text-xs text-white/40">유노바 사이트에서 로그인하시면 구매하신 교재를 다운로드할 수 있습니다</p>
              <a
                href="https://unova.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>open_in_new</span>
                유노바 사이트로 이동
              </a>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm font-medium text-white/60">다운로드 가능한 자료가 없습니다</p>
              <p className="mt-1 text-xs text-white/40">수강 중인 강좌에서 자료가 등록되면 여기에 표시됩니다</p>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
