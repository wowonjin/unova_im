import AppShell from "@/app/_components/AppShell";
import PdfFirstPageThumb from "@/app/_components/PdfFirstPageThumb";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function MaterialsPage() {
  const user = await requireCurrentUser();
  const now = new Date();

  // 교재(관리 플랫폼에서 업로드):
  // - 기본: 공개된 교재만 노출
  // - 단, 아임웹 상품 매핑이 된 교재는 구매(Entitlement)가 있어야 노출
  const textbooksRaw = await prisma.textbook.findMany({
    where: { isPublished: true },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      originalName: true,
      createdAt: true,
      imwebProdCode: true,
    },
  });

  const paywalledIds = textbooksRaw
    .filter((t) => t.imwebProdCode != null && t.imwebProdCode.length > 0)
    .map((t) => t.id);

  const entitledIdSet =
    paywalledIds.length > 0
      ? new Set(
          (
            await prisma.textbookEntitlement.findMany({
              where: { userId: user.id, textbookId: { in: paywalledIds }, status: "ACTIVE", endAt: { gt: now } },
              select: { textbookId: true },
            })
          ).map((e) => e.textbookId)
        )
      : new Set<string>();

  const textbooks = textbooksRaw.filter((t) => {
    const isPaywalled = t.imwebProdCode != null && t.imwebProdCode.length > 0;
    if (!isPaywalled) return true;
    return entitledIdSet.has(t.id);
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
    select: { courseId: true, course: { select: { id: true, title: true } } },
    orderBy: { endAt: "asc" },
  });

  const courseIds = enrollments.map((e) => e.courseId);

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { courseId: { in: courseIds } },
        { lesson: { courseId: { in: courseIds } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { lesson: { select: { id: true, title: true, position: true, courseId: true } } },
  });

  const courseTitleById = new Map(enrollments.map((e) => [e.course.id, e.course.title]));

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">교재 다운로드</h1>

      {textbooks.length ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {textbooks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#212123] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <PdfFirstPageThumb
                  src={`/api/textbooks/${t.id}/view`}
                  title={t.title}
                  className="h-20 w-16 shrink-0 rounded-lg object-cover bg-white/5"
                />
                <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="mt-1 truncate text-xs text-white/70">{t.originalName}</p>
              </div>
              </div>
              <a
                className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                href={`/api/textbooks/${t.id}/download`}
              >
                다운로드
              </a>
            </div>
          ))}
        </div>
      ) : null}

      {textbooks.length === 0 && attachments.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#212123] p-6">
          <p className="text-white/80">다운로드 가능한 자료가 없습니다.</p>
        </div>
      ) : attachments.length ? (
        <div className="mt-6 space-y-2">
          {attachments.map((a) => {
            const courseId = a.courseId ?? a.lesson?.courseId ?? "";
            const courseTitle = courseTitleById.get(courseId) ?? "강좌";
            const lessonLabel = a.lesson ? `${a.lesson.position}강 · ${a.lesson.title}` : "공통 자료";
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#212123] p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.title}</p>
                  <p className="mt-1 truncate text-xs text-white/70">
                    {courseTitle} · {lessonLabel}
                  </p>
                </div>
                <a
                  className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                  href={`/api/attachments/${a.id}/download`}
                >
                  다운로드
                </a>
              </div>
            );
          })}
        </div>
      ) : null}
    </AppShell>
  );
}


