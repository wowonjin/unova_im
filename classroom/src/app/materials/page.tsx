import AppShell from "@/app/_components/AppShell";
import PdfPageCount from "@/app/_components/PdfPageCount";
import DashboardEmptyState from "@/app/_components/DashboardEmptyState";
import MaterialsSearchRegistrar from "@/app/materials/MaterialsSearchRegistrar";
import MaterialsTextbooksSectionClient from "@/app/materials/MaterialsTextbooksSectionClient";
import { getCurrentUserOrGuest } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function MaterialsPage() {
  const user = await getCurrentUserOrGuest();
  const now = new Date();
  const TEST_TITLE_MARKER = "T 교재";

  const isGoogleStorageUrl = (s: string) => {
    const raw = (s || "").trim();
    if (!/^https?:\/\//i.test(raw)) return false;
    try {
      const u = new URL(raw);
      const h = (u.hostname || "").toLowerCase();
      // 대표적인 GCS 도메인들만 허용
      return (
        h === "storage.googleapis.com" ||
        h.endsWith(".storage.googleapis.com") ||
        h === "storage.cloud.google.com" ||
        h.endsWith(".storage.cloud.google.com")
      );
    } catch {
      return false;
    }
  };

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const digits = i === 0 ? 0 : i === 1 ? 0 : 1;
    return `${v.toFixed(digits)}${units[i]}`;
  };

  const formatKoreanDate = (d: Date) => {
    // 2026.01.08 형태
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  // 교재: 이용자 목록(Entitlement)에 있는 사용자만 볼 수 있음
  // 로그인하지 않으면 교재 목록 비움
  let textbooks: {
    id: string;
    title: string;
    storedPath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    pageCount: number | null;
    entitlementDays: number;
    createdAt: Date;
    imwebProdCode: string | null;
    thumbnailUrl: string | null;
    files?: unknown;
  }[] = [];

  let entitlementEndAtByTextbookId = new Map<string, Date>();

  if (user.isLoggedIn && user.id) {
    // 관리자(admin@gmail.com 등)는 모든 교재를 열람/다운로드 가능
    if (user.isAdmin) {
      try {
        textbooks = await prisma.textbook.findMany({
          where: {
            NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
            // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만
            OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            storedPath: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            pageCount: true,
            entitlementDays: true,
            createdAt: true,
            imwebProdCode: true,
            thumbnailUrl: true,
            files: true,
          },
        });
      } catch (e) {
        // 운영/개발 환경에서 마이그레이션 미적용(컬럼 누락)일 수 있음 → pageCount 없이 재조회
        console.warn("[MaterialsPage] textbook.findMany failed (likely migration mismatch). Falling back without pageCount.");
        const rows = await prisma.textbook.findMany({
          where: {
            NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
            // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만
            OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            storedPath: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            entitlementDays: true,
            createdAt: true,
            imwebProdCode: true,
            thumbnailUrl: true,
          },
        });
        textbooks = rows.map((t) => ({ ...t, pageCount: null }));
      }
    } else {
    // 현재 사용자의 활성 권한이 있는 교재 ID 가져오기
    const entitlements = await prisma.textbookEntitlement.findMany({
      where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
      select: { textbookId: true, endAt: true },
    });
    const entitledIds = entitlements.map((e) => e.textbookId);
    entitlementEndAtByTextbookId = new Map(entitlements.map((e) => [e.textbookId, e.endAt]));

    if (entitledIds.length > 0) {
      try {
        textbooks = await prisma.textbook.findMany({
          where: { 
            isPublished: true,
            id: { in: entitledIds },
            NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
            // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만
            OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            storedPath: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            pageCount: true,
            entitlementDays: true,
            createdAt: true,
            imwebProdCode: true,
            thumbnailUrl: true,
            files: true,
          },
        });
      } catch (e) {
        console.warn("[MaterialsPage] textbook.findMany failed (likely migration mismatch). Falling back without pageCount.");
        const rows = await prisma.textbook.findMany({
          where: { 
            isPublished: true,
            id: { in: entitledIds },
            NOT: [{ title: { contains: TEST_TITLE_MARKER } }],
            // /admin/textbooks(판매 물품)과 동일 기준: 판매가/정가 중 하나라도 설정된 교재만
            OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            storedPath: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            entitlementDays: true,
            createdAt: true,
            imwebProdCode: true,
            thumbnailUrl: true,
          },
        });
        textbooks = rows.map((t) => ({ ...t, pageCount: null }));
      }
    }
    }
  }

  // "구글 업로드 URL"로 등록된 교재만 노출 (GCS URL만)
  const googleTextbooks = textbooks.filter((t) => isGoogleStorageUrl(t.storedPath));

  const normalizeFiles = (t: (typeof googleTextbooks)[number]) => {
    const raw = Array.isArray((t as any).files) ? ((t as any).files as any[]) : null;
    const out: { label: string; sizeBytes: number | null; pageCount: number | null; fileIndex: number }[] = [];
    if (raw && raw.length > 0) {
      for (let i = 0; i < raw.length; i += 1) {
        const f = raw[i];
        if (!f || typeof f !== "object") continue;
        const originalName = typeof f.originalName === "string" && f.originalName ? f.originalName : `파일 ${i + 1}`;
        const sizeBytes = Number(f.sizeBytes);
        const pageCount = Number(f.pageCount);
        out.push({
          label: originalName,
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
        sizeBytes: Number.isFinite(t.sizeBytes) ? t.sizeBytes : null,
        pageCount: t.pageCount && t.pageCount > 0 ? t.pageCount : null,
        fileIndex: 0,
      },
    ];
  };

  const searchItems = googleTextbooks.map((t) => ({
    id: t.id,
    type: "textbook" as const,
    title: t.title,
    href: `/materials#textbook-${t.id}`,
    subtitle: null,
  }));

  const enrollments = user.id && !user.isAdmin
    ? await prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE", endAt: { gt: now } },
        select: { courseId: true, course: { select: { id: true, title: true } } },
        orderBy: { endAt: "asc" },
      })
    : [];

  const allCoursesForTitle = user.isAdmin
    ? await prisma.course.findMany({ select: { id: true, title: true } })
    : null;

  const courseIds = user.isAdmin
    ? (allCoursesForTitle ?? []).map((c) => c.id)
    : enrollments.map((e) => e.courseId);

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

  const totalMaterials = googleTextbooks.length + attachments.length;

  return (
    <AppShell>
      <MaterialsSearchRegistrar items={combinedSearchItems} />
      {/* 교재 섹션: 클릭 시 다운로드가 아니라 팝업(리스트)로 */}
      {googleTextbooks.length > 0 ? (
        <MaterialsTextbooksSectionClient
          textbooks={googleTextbooks.map((t) => ({
            id: t.id,
            title: t.title,
            sizeBytes: t.sizeBytes,
            pageCount: t.pageCount,
            entitlementDays: t.entitlementDays,
            createdAtISO: t.createdAt.toISOString(),
            thumbnailUrl: t.thumbnailUrl,
            files: normalizeFiles(t),
          }))}
          isAdmin={user.isAdmin}
          entitlementEndAtByTextbookId={Object.fromEntries(
            Array.from(entitlementEndAtByTextbookId.entries()).map(([id, d]) => [id, d.toISOString()])
          )}
        />
      ) : null}

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
}
