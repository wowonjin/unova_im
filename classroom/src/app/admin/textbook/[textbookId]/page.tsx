import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, HelpTip, PageHeader, Tabs } from "@/app/_components/ui";
import TextbookPublishedSelect from "@/app/_components/TextbookPublishedSelect";
import { ensureSoldOutColumnsOnce } from "@/lib/ensure-columns";
import TextbookThumbnailGenerator from "@/app/_components/TextbookThumbnailGenerator";
import TextbookThumbnailUploadClient from "@/app/_components/TextbookThumbnailUploadClient";
import TextbookBasicInfoClient from "@/app/_components/TextbookBasicInfoClient";
import TextbookDetailPageClient from "@/app/_components/TextbookDetailPageClient";
import TextbookAddonsClient from "@/app/_components/TextbookAddonsClient";
import TextbookFileSelectClient from "@/app/_components/TextbookFileSelectClient";
import TextbookReviewFormClient from "@/app/_components/TextbookReviewFormClient";
import ConfirmDeleteButton, { ConfirmDeleteIconButton } from "@/app/_components/ConfirmDeleteButton";

export default async function AdminTextbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ textbookId: string }>;
  searchParams?: Promise<{ entitle?: string; tab?: string }>;
}) {
  const teacher = await requireAdminUser();
  await ensureSoldOutColumnsOnce();
  const { textbookId } = await params;
  const sp = (await searchParams) ?? {};
  const entitleMsg = sp.entitle || null;
  // "detail" 탭은 기존 호환을 위해 유지하되, UI에서는 "설정"에 합쳐서 표시합니다.
  const tab = (sp.tab || "settings") as "settings" | "detail" | "addons" | "users" | "reviews";
  const activeTab = (tab === "detail" ? "settings" : tab) as "settings" | "addons" | "users" | "reviews";

  // NOTE: 운영에서 마이그레이션 누락 시 Prisma가 모든 컬럼을 조회하다가 크래시가 날 수 있어
  // 먼저 "사용하는 필드만" select 하고, 실패하면 최소 필드로 폴백합니다.
  let textbook:
    | ((
        | {
            id: string;
            title: string;
            subjectName: string | null;
            originalName: string;
            storedPath: string;
            sizeBytes: number;
            pageCount?: number | null;
            createdAt: Date;
            isPublished: boolean;
            thumbnailUrl: string | null;
            imwebProdCode?: string | null;
            // detail tab fields (may be missing if old DB/migration mismatch)
            price?: number | null;
            originalPrice?: number | null;
            rating?: number | null;
            reviewCount?: number | null;
            tags?: unknown;
            benefits?: unknown;
            features?: unknown;
            description?: string | null;
            entitlementDays?: number | null;
            teacherName?: string | null;
            teacherTitle?: string | null;
            teacherDescription?: string | null;
            relatedTextbookIds?: unknown;
          }
        | {
            id: string;
            title: string;
            subjectName: string | null;
            originalName: string;
            storedPath: string;
            sizeBytes: number;
            pageCount?: number | null;
            createdAt: Date;
            isPublished: boolean;
            thumbnailUrl: string | null;
            imwebProdCode?: string | null;
            // detail tab fields (optional)
            price?: number | null;
            originalPrice?: number | null;
            rating?: number | null;
            reviewCount?: number | null;
            tags?: unknown;
            benefits?: unknown;
            features?: unknown;
            description?: string | null;
            entitlementDays?: number | null;
            teacherName?: string | null;
            teacherTitle?: string | null;
            teacherDescription?: string | null;
            relatedTextbookIds?: unknown;
          }
      ) & {
        entitlements: {
          id: string;
          status: string;
          startAt: Date;
          endAt: Date;
          createdAt: Date;
          user: { id: string; email: string };
        }[];
      })
    | null = null;

  try {
    textbook = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: {
        id: true,
        title: true,
        subjectName: true,
        originalName: true,
        storedPath: true,
        sizeBytes: true,
        pageCount: true,
        createdAt: true,
        isPublished: true,
        isSoldOut: true,
        thumbnailUrl: true,
        imwebProdCode: true,
        composition: true,
        textbookType: true,
        // detail tab fields
        price: true,
        originalPrice: true,
        rating: true,
        reviewCount: true,
        tags: true,
        benefits: true,
        features: true,
        extraOptions: true,
        description: true,
        // optional fields (may be missing if migration not applied yet)
        entitlementDays: true,
        teacherName: true,
        teacherImageUrl: true,
        teacherTitle: true,
        teacherDescription: true,
        relatedTextbookIds: true,
        files: true,
        entitlements: {
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            createdAt: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    });
  } catch (e) {
    // NOTE: Next dev(Turbopack)에서 server console.error가 소스맵 오버레이 이슈를 유발하는 경우가 있어
    // 여기서는 에러 객체를 그대로 찍지 않고 warn으로 낮춰 노이즈/오버레이를 줄입니다.
    console.warn("[AdminTextbookPage] textbook.findUnique failed (likely migration mismatch). Falling back to minimal select.");
    textbook = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: {
        id: true,
        title: true,
        subjectName: true,
        originalName: true,
        storedPath: true,
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        isSoldOut: true,
        thumbnailUrl: true,
        imwebProdCode: true,
        entitlements: {
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            createdAt: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    });
  }

  if (!textbook) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">교재를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  // 다른 교재 목록 (추가 교재 선택용) - "추가 상품" 탭에서만 사용
  const otherTextbooks =
    activeTab === "addons"
      ? await prisma.textbook.findMany({
          where: {
            ownerId: teacher.id,
            id: { not: textbookId },
            // "상품 등록(판매 물품)" 페이지에 노출되는 교재만 (판매 설정된 교재)
            OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
          },
          select: {
            id: true,
            title: true,
            subjectName: true,
            thumbnailUrl: true,
          },
          // 판매 목록과 동일한 정렬(관리용 position 우선, 없으면 최신순)
          orderBy: [{ position: "desc" }, { createdAt: "desc" }],
        }).catch(async () => {
          return await prisma.textbook.findMany({
            where: {
              ownerId: teacher.id,
              id: { not: textbookId },
              OR: [{ price: { not: null } }, { originalPrice: { not: null } }],
            },
            select: { id: true, title: true, subjectName: true, thumbnailUrl: true },
            orderBy: [{ createdAt: "desc" }],
          });
        })
      : [];

  // "등록된 교재"(교재 업로드 플로우) 목록 - 파일 연결용
  const registeredTextbooks =
    activeTab === "settings"
      ? await prisma.textbook
          .findMany({
            where: {
              ownerId: teacher.id,
              OR: [
                { storedPath: { contains: "storage.googleapis.com" } },
                { storedPath: { contains: "storage.cloud.google.com" } },
              ],
              // 판매 설정(가격/원가)이 들어간 항목은 제외
              price: null,
              originalPrice: null,
            },
            orderBy: [{ createdAt: "desc" }],
            select: {
              id: true,
              title: true,
              originalName: true,
              storedPath: true,
              files: true,
              sizeBytes: true,
              pageCount: true,
            },
            take: 400,
          })
          .catch(async () => {
            return await prisma.textbook.findMany({
              where: {
                ownerId: teacher.id,
                OR: [
                  { storedPath: { contains: "storage.googleapis.com" } },
                  { storedPath: { contains: "storage.cloud.google.com" } },
                ],
                price: null,
                originalPrice: null,
              },
              orderBy: [{ createdAt: "desc" }],
              // NOTE: files 컬럼 마이그레이션 누락 등으로 크래시날 수 있어 폴백에서는 files 제외
              select: { id: true, title: true, originalName: true, storedPath: true, sizeBytes: true, pageCount: true },
              take: 400,
            });
          })
      : [];

  // 파일 연결 UI의 "선택된 등록 교재"를 수정 화면에서 복원하기 위한 initialSelectedIds 계산
  const initialSelectedSourceTextbookIds =
    activeTab !== "settings"
      ? []
      : (() => {
          const currentFilePaths = new Set<string>();

          const textbookFiles = Array.isArray((textbook as any)?.files) ? ((textbook as any).files as any[]) : null;
          if (textbookFiles && textbookFiles.length > 0) {
            for (const f of textbookFiles) {
              const p = typeof f?.storedPath === "string" ? f.storedPath : null;
              if (p) currentFilePaths.add(p);
            }
          }

          if (typeof (textbook as any)?.storedPath === "string" && (textbook as any).storedPath) {
            currentFilePaths.add((textbook as any).storedPath);
          }

          if (currentFilePaths.size === 0) return [];

          const matched: string[] = [];

          for (const src of registeredTextbooks as any[]) {
            const srcPaths = new Set<string>();
            if (typeof src?.storedPath === "string" && src.storedPath) srcPaths.add(src.storedPath);

            const srcFiles = Array.isArray(src?.files) ? (src.files as any[]) : null;
            if (srcFiles && srcFiles.length > 0) {
              for (const f of srcFiles) {
                const p = typeof f?.storedPath === "string" ? f.storedPath : null;
                if (p) srcPaths.add(p);
              }
            }

            if (srcPaths.size === 0) continue;

            let hit = false;
            for (const p of srcPaths) {
              if (currentFilePaths.has(p)) {
                hit = true;
                break;
              }
            }
            if (hit) matched.push(src.id);
          }

          // select value 안정성을 위해 options에 존재하는 id만 유지
          const optionIdSet = new Set(registeredTextbooks.map((t) => t.id));
          return matched.filter((id) => optionIdSet.has(id));
        })();

  // entitlementDays 필드 안전 처리 (마이그레이션 미적용 시 기본값)
  const entitlementDays = (textbook as { entitlementDays?: number }).entitlementDays ?? 30;

  // 후기 목록 조회 (reviews 탭에서만)
  const reviews =
    activeTab === "reviews"
      ? await prisma.review.findMany({
          where: { textbookId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            authorName: true,
            rating: true,
            content: true,
            isApproved: true,
            createdAt: true,
            user: { select: { id: true, email: true } },
          },
        })
      : [];

  const fmtShortDate = (d: Date) => d.toISOString().slice(2, 10).replace(/-/g, ".");

  return (
    <AppShell>
      <PageHeader
        title="교재 관리"
        description={textbook.title}
        right={
          <div className="flex items-center gap-2">
            <Button href="/admin/textbooks" variant="secondary">
              ← 목록으로
            </Button>
            <ConfirmDeleteButton
              action={`/api/admin/textbooks/${textbook.id}/delete`}
              message="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
            />
          </div>
        }
      />

      <Tabs
        activeKey={activeTab}
        items={[
          { key: "settings", label: "설정", href: `/admin/textbook/${textbook.id}?tab=settings` },
          { key: "addons", label: "추가 상품", href: `/admin/textbook/${textbook.id}?tab=addons` },
          { key: "reviews", label: "후기", href: `/admin/textbook/${textbook.id}?tab=reviews` },
          { key: "users", label: "이용자", href: `/admin/textbook/${textbook.id}?tab=users` },
        ]}
      />

      <div className="mt-6">
        {activeTab === "settings" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            {/* 왼쪽: 기본 정보 */}
            <Card className="lg:col-span-5">
              <CardHeader
                title="기본 정보"
                right={
                  <TextbookPublishedSelect
                    textbookId={textbook.id}
                    isPublished={textbook.isPublished}
                    isSoldOut={(textbook as any).isSoldOut ?? false}
                  />
                }
              />
              <CardBody className="space-y-8">
                <TextbookBasicInfoClient
                  textbookId={textbook.id}
                  initialTitle={textbook.title}
                  initialTeacherName={(textbook as { teacherName?: string | null }).teacherName ?? ""}
                  initialTeacherImageUrl={(textbook as { teacherImageUrl?: string | null }).teacherImageUrl ?? null}
                  initialIsbn={(textbook as { imwebProdCode?: string | null }).imwebProdCode ?? ""}
                  initialSubjectName={textbook.subjectName || ""}
                  initialEntitlementDays={entitlementDays}
                  initialComposition={(textbook as { composition?: string | null }).composition ?? ""}
                />

                {/* 파일 연결 */}
                <div className="pt-4 border-t border-white/10">
                  <TextbookFileSelectClient
                    textbookId={textbook.id}
                    registeredTextbooks={registeredTextbooks}
                    initialSelectedIds={initialSelectedSourceTextbookIds}
                  />
                </div>

                {/* 썸네일 및 다운로드 */}
                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/60 mb-3">썸네일 및 다운로드</h4>
                  <div className="space-y-3">
                    <TextbookThumbnailUploadClient textbookId={textbook.id} hasThumbnail={!!textbook.thumbnailUrl} />

                    <div className="flex flex-wrap items-center gap-3">
                      <TextbookThumbnailGenerator textbookId={textbook.id} hasThumbnail={!!textbook.thumbnailUrl} />

                      <a
                        href={`/api/admin/textbooks/${textbook.id}/download`}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        다운로드
                      </a>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 오른쪽: 상세 페이지 설정 */}
            <Card className="lg:col-span-7 min-w-0">
              <CardHeader
                title="상세 페이지 설정"
                description="스토어에 표시되는 교재 상세 페이지의 내용을 설정합니다."
              />
              <CardBody>
                <TextbookDetailPageClient
                  textbookId={textbook.id}
                  initial={{
                    price: textbook.price ?? null,
                    originalPrice: textbook.originalPrice ?? null,
                    teacherTitle: (textbook as { teacherTitle?: string | null }).teacherTitle ?? null,
                    teacherDescription: (textbook as { teacherDescription?: string | null }).teacherDescription ?? null,
                    tags: (textbook.tags as string[] | null) ?? [],
                    textbookType: (textbook as { textbookType?: string | null }).textbookType ?? null,
                    benefits: (textbook.benefits as string[] | null) ?? [],
                    features: (textbook.features as string[] | null) ?? [],
                    extraOptions:
                      (textbook as { extraOptions?: { name: string; value: string }[] | null }).extraOptions ?? [],
                    description: textbook.description ?? null,
                    relatedTextbookIds:
                      ((textbook as { relatedTextbookIds?: unknown }).relatedTextbookIds as string[] | null) ?? [],
                  }}
                />
              </CardBody>
            </Card>
          </div>
        ) : activeTab === "addons" ? (
          <Card>
            <CardHeader title="추가 상품" description="이 교재 상세 페이지에 함께 노출할 추가 교재를 선택합니다." />
            <CardBody>
              <TextbookAddonsClient
                textbookId={textbook.id}
                otherTextbooks={otherTextbooks}
                initialRelatedTextbookIds={
                  ((textbook as { relatedTextbookIds?: unknown }).relatedTextbookIds as string[] | null) ?? []
                }
              />
            </CardBody>
          </Card>
        ) : activeTab === "users" ? (
          <Card>
            <CardHeader
              title="이용자 목록"
              description="이 교재에 대한 권한이 있는 사용자 목록입니다."
              right={<Badge tone={textbook.entitlements.length ? "neutral" : "muted"}>{textbook.entitlements.length}명</Badge>}
            />
            <CardBody>
              {/* 이용자 추가 폼 */}
              {entitleMsg === "success" && (
                <p className="mb-3 text-sm text-emerald-400">이용자가 등록되었습니다.</p>
              )}
              {entitleMsg === "removed" && (
                <p className="mb-3 text-sm text-white/70">이용자가 삭제되었습니다.</p>
              )}
              {entitleMsg === "invalid" && (
                <p className="mb-3 text-sm text-red-400">올바른 이메일 주소를 입력해주세요.</p>
              )}
              {entitleMsg === "error" && (
                <p className="mb-3 text-sm text-red-400">오류가 발생했습니다.</p>
              )}

              <form action="/api/admin/textbook-entitlements/add" method="post" className="mb-5">
                <input type="hidden" name="textbookId" value={textbook.id} />
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="이메일 주소 입력 후 Enter"
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 pr-20 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15"
                    >
                      추가
                    </button>
                  </div>
                  <HelpTip text={`이용 기간: ${entitlementDays}일`} />
                </div>
              </form>

              {textbook.entitlements.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-white/60">
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-3">이메일</th>
                        <th className="py-3 pr-3">상태</th>
                        <th className="py-3 pr-3">이용기간</th>
                        <th className="py-3 pr-3">등록일</th>
                        <th className="py-3 pr-3 text-right" aria-label="액션"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {textbook.entitlements.map((e) => (
                        <tr key={e.id} className="border-b border-white/10">
                          <td className="py-3 pr-3">
                            <div className="truncate font-medium text-white">{e.user.email}</div>
                          </td>
                          <td className="py-3 pr-3">
                            <Badge tone={e.status === "ACTIVE" ? "success" : "muted"}>{e.status}</Badge>
                          </td>
                          <td className="py-3 pr-3 text-white/70">
                            {fmtShortDate(e.startAt)}~{fmtShortDate(e.endAt)}
                          </td>
                          <td className="py-3 pr-3 text-white/60">{fmtShortDate(e.createdAt)}</td>
                          <td className="py-3 pr-3">
                            <ConfirmDeleteIconButton
                              action="/api/admin/textbook-entitlements/remove"
                              hiddenInputs={[{ name: "entitlementId", value: e.id }]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-white/60">등록된 이용자가 없습니다.</p>
              )}
            </CardBody>
          </Card>
        ) : activeTab === "reviews" ? (
          <Card>
            <CardHeader
              title="후기 관리"
              description="이 교재에 등록된 후기를 관리합니다."
              right={<Badge tone={reviews.length ? "neutral" : "muted"}>{reviews.length}개</Badge>}
            />
            <CardBody>
              {/* 후기 추가 폼 */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <h4 className="text-sm font-medium text-white/70 mb-4">새 후기 등록</h4>
                <TextbookReviewFormClient textbookId={textbook.id} />
              </div>

              {/* 후기 목록 */}
              {reviews.length ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-white">{review.authorName}</span>
                            <span className="text-yellow-400">
                              {"★".repeat(review.rating)}
                              <span className="text-white/20">{"★".repeat(5 - review.rating)}</span>
                            </span>
                            <span className="text-xs text-white/40">
                              {fmtShortDate(review.createdAt)}
                            </span>
                            {!review.isApproved && (
                              <Badge tone="muted">미승인</Badge>
                            )}
                          </div>
                          <p className="text-sm text-white/70 whitespace-pre-line">{review.content}</p>
                          {review.user && (
                            <p className="mt-2 text-xs text-white/40">
                              회원: {review.user.email}
                            </p>
                          )}
                        </div>
                        <ConfirmDeleteIconButton
                          action="/api/admin/textbook-reviews/remove"
                          hiddenInputs={[{ name: "reviewId", value: review.id }]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">등록된 후기가 없습니다.</p>
              )}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

