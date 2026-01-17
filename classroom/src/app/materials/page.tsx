import AppShell from "@/app/_components/AppShell";
import DashboardEmptyState from "@/app/_components/DashboardEmptyState";
import MaterialsSearchRegistrar from "@/app/materials/MaterialsSearchRegistrar";
import MaterialsTextbooksSectionClient from "@/app/materials/MaterialsTextbooksSectionClient";
import { getCurrentUserOrGuest } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function MaterialsPage() {
  const user = await getCurrentUserOrGuest();
  const now = new Date();
  const TEST_TITLE_MARKER = "T 교재";
  try {

  // ====== NEW IMPLEMENTATION (요청사항: "상품 등록"의 교재 목록 기준으로 노출) ======
  // - "상품 등록"(/admin/textbooks → 새 물품 등록)에서 선택되는 교재 옵션과 동일한 기준:
  //   ownerId + storedPath가 GCS(외부 URL) + price/originalPrice가 null(=업로드 교재)
  // - 구매(Entitlement)로 접근 가능한 판매 상품의 files(storedPath)들을,
  //   위 "업로드 교재" 목록의 storedPath와 매칭해서 title로 표시합니다.

  type SaleTextbookRow = {
    id: string;
    ownerId: string;
    title: string;
    storedPath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    pageCount: number | null;
    entitlementDays: number;
    createdAt: Date;
    thumbnailUrl: string | null;
    files?: unknown;
  };

  type NormalizedFile = { label: string; storedPath: string | null; sizeBytes: number | null; pageCount: number | null; fileIndex: number };

  const normalizeFiles = (t: SaleTextbookRow): NormalizedFile[] => {
    const raw = Array.isArray((t as any).files) ? ((t as any).files as any[]) : null;
    const out: NormalizedFile[] = [];
    if (raw && raw.length > 0) {
      for (let i = 0; i < raw.length; i += 1) {
        const f = raw[i];
        if (!f || typeof f !== "object") continue;
        const originalName = typeof f.originalName === "string" && f.originalName ? f.originalName : `파일 ${i + 1}`;
        const sizeBytes = Number(f.sizeBytes);
        const pageCount = Number(f.pageCount);
        const storedPath = typeof f.storedPath === "string" && f.storedPath ? f.storedPath : null;
        out.push({
          label: originalName,
          storedPath,
          sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
          pageCount: Number.isFinite(pageCount) && pageCount > 0 ? pageCount : null,
          fileIndex: i,
        });
      }
    }
    if (out.length > 0) return out;
    // 폴백: 단일 파일만
    return [
      {
        label: t.originalName || t.title,
        storedPath: (t.storedPath || "").trim() ? t.storedPath : null,
        sizeBytes: Number.isFinite(t.sizeBytes) ? t.sizeBytes : null,
        pageCount: t.pageCount && t.pageCount > 0 ? t.pageCount : null,
        fileIndex: 0,
      },
    ];
  };

  const isRegisteredExternalUrl = (url: string) => {
    const u = (url || "").toLowerCase();
    return u.includes("storage.googleapis.com") || u.includes("storage.cloud.google.com") || u.startsWith("gs://") || u.startsWith("https://") || u.startsWith("http://");
  };

  // 로그인하지 않으면 교재 목록 비움
  let saleTextbooks: SaleTextbookRow[] = [];
  let enrollments: { courseId: string; endAt: Date; course: { id: string; title: string } }[] = [];
  let entitlementEndAtISOByTextbookId: Record<string, string> = {};

  if (user.isLoggedIn && user.id) {
    // 강좌 첨부파일(기존 기능 유지): 수강중인 강좌 범위
    enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
      select: { courseId: true, endAt: true, course: { select: { id: true, title: true } } },
      orderBy: { endAt: "asc" },
    });

    if (user.isAdmin) {
      // 관리자는 판매 상품 전체를 볼 수 있음
      saleTextbooks = await prisma.textbook.findMany({
        where: {
          NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
          OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
        },
        orderBy: [{ position: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          ownerId: true,
          title: true,
          storedPath: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          pageCount: true,
          entitlementDays: true,
          createdAt: true,
          thumbnailUrl: true,
          files: true,
        },
      }).catch(async () => {
        const rows = await prisma.textbook.findMany({
          where: {
            NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
            OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            ownerId: true,
            title: true,
            storedPath: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            entitlementDays: true,
            createdAt: true,
            thumbnailUrl: true,
            files: true,
          },
        });
        return rows.map((t) => ({ ...t, pageCount: null })) as any;
      });
    } else {
      // 구매(Entitlement)된 판매 상품만
      const entitlements = await prisma.textbookEntitlement.findMany({
        where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
        select: { textbookId: true, endAt: true },
      });
      const entitledIds = entitlements.map((e) => e.textbookId);
      // 같은 textbook에 entitlement가 여러 개 있을 수 있으므로 가장 늦은 endAt만 사용
      entitlementEndAtISOByTextbookId = entitlements.reduce<Record<string, string>>((acc, e) => {
        if (!e?.textbookId || !e?.endAt) return acc;
        const iso = e.endAt.toISOString();
        const prev = acc[e.textbookId];
        if (!prev || iso > prev) acc[e.textbookId] = iso;
        return acc;
      }, {});
      if (entitledIds.length > 0) {
        saleTextbooks = await prisma.textbook.findMany({
          where: {
            isPublished: true,
            id: { in: entitledIds },
            NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            ownerId: true,
            title: true,
            storedPath: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            pageCount: true,
            entitlementDays: true,
            createdAt: true,
            thumbnailUrl: true,
            files: true,
          },
        }).catch(async () => {
          const rows = await prisma.textbook.findMany({
            where: {
              isPublished: true,
              id: { in: entitledIds },
              NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
            },
            orderBy: [{ createdAt: "desc" }],
            select: {
              id: true,
              ownerId: true,
              title: true,
              storedPath: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              entitlementDays: true,
              createdAt: true,
              thumbnailUrl: true,
              files: true,
            },
          });
          return rows.map((t) => ({ ...t, pageCount: null })) as any;
        });
      }
    }
  }

  // 판매상품에서 실제 다운로드 가능한 파일(외부 URL/로컬 포함)만
  const visibleSaleTextbooks = saleTextbooks.filter((t) => (t.storedPath || "").trim().length > 0);

  // "상품 등록"의 교재 옵션(title) 매칭: 판매상품의 파일 storedPath -> 업로드 교재 title
  const ownerIds = Array.from(new Set(visibleSaleTextbooks.map((t) => t.ownerId).filter(Boolean)));
  const titleByStoredPath = new Map<string, string>();

  for (const ownerId of ownerIds) {
    // 상품 등록의 textbookOptions와 동일: 업로드 교재(가격/원가 없음) + GCS/외부 URL
    const registered = await prisma.textbook.findMany({
      where: {
        ownerId,
        OR: [
          { storedPath: { contains: "storage.googleapis.com" } },
          { storedPath: { contains: "storage.cloud.google.com" } },
        ],
        price: null,
        originalPrice: null,
        NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
      },
      select: { title: true, storedPath: true, files: true },
      take: 500,
      orderBy: [{ createdAt: "desc" }],
    }).catch(async () => {
      // files 컬럼 누락 등 폴백
      return await prisma.textbook.findMany({
        where: {
          ownerId,
          OR: [
            { storedPath: { contains: "storage.googleapis.com" } },
            { storedPath: { contains: "storage.cloud.google.com" } },
          ],
          price: null,
          originalPrice: null,
          NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
        },
        select: { title: true, storedPath: true },
        take: 500,
        orderBy: [{ createdAt: "desc" }],
      });
    });

    for (const t of registered as any[]) {
      if (typeof t?.storedPath === "string" && t.storedPath && isRegisteredExternalUrl(t.storedPath)) {
        titleByStoredPath.set(t.storedPath, t.title);
      }
      const fs = Array.isArray(t?.files) ? (t.files as any[]) : null;
      if (fs && fs.length > 0) {
        for (const f of fs) {
          const p = typeof f?.storedPath === "string" ? f.storedPath : "";
          if (p && isRegisteredExternalUrl(p)) titleByStoredPath.set(p, t.title);
        }
      }
    }
  }

  const textbookDownloadItems = visibleSaleTextbooks.flatMap((t) => {
    const files = normalizeFiles(t);
    return files.map((f) => {
      const mappedTitle = f.storedPath ? titleByStoredPath.get(f.storedPath) : null;
      return {
        id: `${t.id}:${f.fileIndex}`,
        title: mappedTitle || f.label || t.title,
        thumbnailUrl: t.thumbnailUrl,
        sizeBytes: f.sizeBytes,
        pageCount: f.pageCount,
        entitlementDays: t.entitlementDays,
        entitlementEndAtISO: user.isAdmin ? null : entitlementEndAtISOByTextbookId[t.id] ?? null,
        createdAtISO: t.createdAt.toISOString(),
        downloadHref: `/api/textbooks/${t.id}/download?file=${f.fileIndex}`,
      };
    });
  });

  const searchItems = textbookDownloadItems.map((t) => ({
    id: t.id,
    type: "textbook" as const,
    title: t.title,
    href: "/materials",
    subtitle: null,
  }));

  const allCoursesForTitle = user.isAdmin ? await prisma.course.findMany({ select: { id: true, title: true } }) : null;
  const courseIds = user.isAdmin ? (allCoursesForTitle ?? []).map((c) => c.id) : enrollments.map((e) => e.courseId);
  const courseSearchItems = (user.isAdmin ? (allCoursesForTitle ?? []) : enrollments.map((e) => e.course)).map((c) => ({
    id: c.id,
    type: "course" as const,
    title: c.title,
    href: `/dashboard?course=${encodeURIComponent(c.id)}`,
    subtitle: "수강중인 강좌",
  }));

  const combinedSearchItems = [...courseSearchItems, ...searchItems];

  const attachments = user.isAdmin
    ? await prisma.attachment.findMany({
        orderBy: { createdAt: "desc" },
        include: { lesson: { select: { id: true, title: true, position: true, courseId: true } } },
      })
    : courseIds.length > 0
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

  const courseTitleById = user.isAdmin
    ? new Map((allCoursesForTitle ?? []).map((c) => [c.id, c.title]))
    : new Map(enrollments.map((e) => [e.course.id, e.course.title]));

  const totalMaterials = textbookDownloadItems.length + attachments.length;

  return (
    <AppShell>
      <MaterialsSearchRegistrar items={combinedSearchItems} />
      {/* 교재 섹션: 클릭 시 다운로드가 아니라 팝업(리스트)로 */}
      {textbookDownloadItems.length > 0 ? <MaterialsTextbooksSectionClient items={textbookDownloadItems} /> : null}

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
                  className="group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#1C1C1C] p-4 transition-colors hover:border-white/[0.12] hover:bg-[#232323]"
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {!user.isLoggedIn ? (
            <DashboardEmptyState isLoggedIn={false} />
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                <span className="material-symbols-outlined text-[32px] text-white/30">folder_off</span>
              </div>
              <p className="mt-4 text-sm font-medium text-white/60">다운로드 가능한 자료가 없습니다</p>
              <p className="mt-1 text-xs text-white/40">구매하신 교재가 등록되면 여기에 표시됩니다</p>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
  } catch (e) {
    console.error("[materials] page render failed:", e);
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <span className="material-symbols-outlined text-[32px] text-white/30">cloud_off</span>
          </div>
          <p className="mt-4 text-sm font-medium text-white/70">자료를 불러오지 못했습니다</p>
          <p className="mt-1 text-xs text-white/40">잠시 후 다시 시도해주세요.</p>
        </div>
      </AppShell>
    );
  }
}
