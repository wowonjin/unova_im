import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader } from "@/app/_components/ui";
import NoticePublishedSelect from "@/app/_components/NoticePublishedSelect";
import RichTextEditor from "@/app/_components/RichTextEditor";

function fmt(d: Date) {
  return d.toISOString().slice(2, 10).replace(/-/g, ".");
}

export default async function AdminNoticesPage() {
  const teacher = await requireAdminUser();

  const categoriesRaw = await prisma.notice.findMany({
    where: { authorId: teacher.id },
    select: { category: true },
  });
  const categories = Array.from(
    new Set(
      categoriesRaw
        .map((x) => x.category)
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  const notices = await prisma.notice.findMany({
    where: { authorId: teacher.id },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <AppShell>
      <PageHeader
        title="새 공지사항 만들기"
        right={
          <div className="flex items-center gap-2">
            <Button href="/admin/courses" variant="secondary">
              강좌 관리하기
            </Button>
            <Button href="/admin/textbooks" variant="secondary">
              교재 관리하기
            </Button>
          </div>
        }
      />

      <div className="mt-6 space-y-6">
        <Card className="bg-transparent">
          <CardHeader title="새 공지사항 만들기" />
          <CardBody>
            <form className="grid grid-cols-1 gap-4" action="/api/admin/notices/create" method="post">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
                <Field label="카테고리">
                  <div className="mt-1">
                    <Input
                      name="category"
                      required
                      placeholder="예: 공지 / 이벤트 / 과제"
                      className="bg-transparent"
                      list="notice-category"
                    />
                    <datalist id="notice-category">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </Field>
                <Field label="제목">
                  <Input name="title" required placeholder="예: 12/20 휴강 안내" className="bg-transparent" />
                </Field>
                <Field label="공개 상태">
                  <select
                    name="isPublished"
                    defaultValue="1"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#212123] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="1">공개</option>
                    <option value="0">비공개</option>
                  </select>
                </Field>
              </div>

              <Field label="내용">
                <RichTextEditor name="body" placeholder="공지 내용을 입력하세요" minHeightClassName="min-h-[420px]" />
              </Field>

              <div className="flex justify-start">
                <Button type="submit" variant="ghostSolid">
                  등록
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="내 공지사항 목록"
            right={<Badge tone={notices.length ? "neutral" : "muted"}>{notices.length}개</Badge>}
          />
          <CardBody>
            {notices.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-3 pr-3">카테고리</th>
                      <th className="py-3 pr-3">제목</th>
                      <th className="py-3 pr-3">상태</th>
                      <th className="py-3 pr-3">주소</th>
                      <th className="py-3 pr-3">작성</th>
                      <th className="py-3 text-right" aria-label="액션" />
                    </tr>
                  </thead>
                  <tbody>
                    {notices.map((n) => (
                      <tr key={n.id} className="border-b border-white/10">
                        <td className="py-3 pr-3 text-white/70">{n.category}</td>
                        <td className="py-3 pr-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">{n.title}</div>
                            <a
                              className="mt-1 inline-block truncate text-xs text-white/60 hover:text-white/80 hover:underline"
                              href={`/notices/${n.slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              미리보기: /notices/{n.slug}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <NoticePublishedSelect noticeId={n.id} isPublished={n.isPublished} />
                        </td>
                        <td className="py-3 pr-3 text-white/70">{n.slug}</td>
                        <td className="py-3 pr-3 text-white/60">{fmt(n.createdAt)}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <form action={`/api/admin/notices/${n.id}/delete`} method="post">
                              <Button type="submit" size="sm" variant="dangerGhost">
                                삭제
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-white/60">등록된 공지사항이 없습니다.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}


