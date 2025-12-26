import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, HelpTip, PageHeader, Tabs } from "@/app/_components/ui";
import TextbookPublishedSelect from "@/app/_components/TextbookPublishedSelect";
import TextbookThumbnailGenerator from "@/app/_components/TextbookThumbnailGenerator";
import TextbookBasicInfoClient from "@/app/_components/TextbookBasicInfoClient";
import TextbookDetailPageClient from "@/app/_components/TextbookDetailPageClient";
import ConfirmDeleteButton, { ConfirmDeleteIconButton } from "@/app/_components/ConfirmDeleteButton";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export default async function AdminTextbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ textbookId: string }>;
  searchParams?: Promise<{ entitle?: string; tab?: string }>;
}) {
  const teacher = await requireAdminUser();
  const { textbookId } = await params;
  const sp = (await searchParams) ?? {};
  const entitleMsg = sp.entitle || null;
  const tab = (sp.tab || "settings") as "settings" | "detail" | "users";

  // NOTE: 운영에서 마이그레이션 누락 시 Prisma가 모든 컬럼을 조회하다가 크래시가 날 수 있어
  // 먼저 "사용하는 필드만" select 하고, 실패하면 최소 필드로 폴백합니다.
  let textbook:
    | ((
        | {
            id: string;
            title: string;
            subjectName: string | null;
            originalName: string;
            sizeBytes: number;
            createdAt: Date;
            isPublished: boolean;
            thumbnailUrl: string | null;
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
          }
        | {
            id: string;
            title: string;
            subjectName: string | null;
            originalName: string;
            sizeBytes: number;
            createdAt: Date;
            isPublished: boolean;
            thumbnailUrl: string | null;
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
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        thumbnailUrl: true,
        // detail tab fields
        price: true,
        originalPrice: true,
        rating: true,
        reviewCount: true,
        tags: true,
        benefits: true,
        features: true,
        description: true,
        // optional fields (may be missing if migration not applied yet)
        entitlementDays: true,
        teacherName: true,
        teacherTitle: true,
        teacherDescription: true,
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
    console.error("[AdminTextbookPage] textbook.findUnique failed (likely migration mismatch):", e);
    textbook = await prisma.textbook.findUnique({
      where: { id: textbookId, ownerId: teacher.id },
      select: {
        id: true,
        title: true,
        subjectName: true,
        originalName: true,
        sizeBytes: true,
        createdAt: true,
        isPublished: true,
        thumbnailUrl: true,
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

  // entitlementDays 필드 안전 처리 (마이그레이션 미적용 시 기본값)
  const entitlementDays = (textbook as { entitlementDays?: number }).entitlementDays ?? 30;

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
        activeKey={tab}
        items={[
          { key: "settings", label: "설정", href: `/admin/textbook/${textbook.id}?tab=settings` },
          { key: "detail", label: "상세 페이지", href: `/admin/textbook/${textbook.id}?tab=detail` },
          { key: "users", label: "이용자", href: `/admin/textbook/${textbook.id}?tab=users` },
        ]}
      />

      <div className="mt-6">
        {tab === "settings" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 기본 정보 */}
            <Card>
              <CardHeader
                title="기본 정보"
                right={<TextbookPublishedSelect textbookId={textbook.id} isPublished={textbook.isPublished} />}
              />
              <CardBody>
                <TextbookBasicInfoClient
                  textbookId={textbook.id}
                  initialTitle={textbook.title}
                  initialTeacherName={(textbook as { teacherName?: string | null }).teacherName ?? ""}
                  initialSubjectName={textbook.subjectName || ""}
                  initialEntitlementDays={entitlementDays}
                />

                {/* 파일 정보 */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/60 mb-3">파일 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">원본 파일명</span>
                      <span className="text-white/80">{textbook.originalName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">파일 크기</span>
                      <span className="text-white/80">{formatBytes(textbook.sizeBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">등록일</span>
                      <span className="text-white/80">{new Date(textbook.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 썸네일 및 다운로드 */}
            <Card>
              <CardHeader title="썸네일 및 다운로드" />
              <CardBody>
                <div className="flex items-start gap-4">
                  {textbook.thumbnailUrl ? (
                    <div className="shrink-0 w-24 h-32 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={textbook.thumbnailUrl}
                        alt="썸네일"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="shrink-0 w-24 h-32 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                      <span className="text-white/30 text-xs">미등록</span>
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-3">
                    <TextbookThumbnailGenerator textbookId={textbook.id} hasThumbnail={!!textbook.thumbnailUrl} />
                    
                    <a
                      href={`/api/admin/textbooks/${textbook.id}/download`}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      다운로드
                    </a>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : tab === "detail" ? (
          <Card>
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
                  rating: textbook.rating ?? null,
                  reviewCount: textbook.reviewCount ?? 0,
                  teacherTitle: (textbook as { teacherTitle?: string | null }).teacherTitle ?? null,
                  teacherDescription: (textbook as { teacherDescription?: string | null }).teacherDescription ?? null,
                  tags: (textbook.tags as string[] | null) ?? [],
                  benefits: (textbook.benefits as string[] | null) ?? [],
                  features: (textbook.features as string[] | null) ?? [],
                  description: textbook.description ?? null,
                }}
              />
            </CardBody>
          </Card>
        ) : (
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
        )}
      </div>
    </AppShell>
  );
}

