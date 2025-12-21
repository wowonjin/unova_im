import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, CardBody, CardHeader, Field, HelpTip, Input, PageHeader } from "@/app/_components/ui";
import TextbookPublishedSelect from "@/app/_components/TextbookPublishedSelect";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export default async function AdminTextbooksPage() {
  const teacher = await requireAdminUser();

  const textbooks = await prisma.textbook.findMany({
    where: { ownerId: teacher.id },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      isPublished: true,
      originalName: true,
      sizeBytes: true,
      createdAt: true,
      imwebProdCode: true,
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="교재 관리하기"
        right={
          <div className="flex items-center gap-2">
            <Button href="/admin/courses" variant="secondary">
              강좌 관리하기
            </Button>
            <Button href="/admin/events" variant="secondary">
              웹훅/이벤트 로그
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <Card className="bg-transparent">
            <CardHeader title="교재 관리하기" />
            <CardBody>
              <form
                className="grid grid-cols-1 gap-4"
                action="/api/admin/textbooks/create"
                method="post"
              >
                <Field label="교재 제목(선택)">
                  <Input name="title" placeholder="예: 2027 수학 교재 PDF" className="bg-transparent" />
                </Field>
                <Field label="구글 업로드 URL">
                  <Input
                    name="url"
                    required
                    placeholder="예: https://storage.googleapis.com/버킷/파일.pdf"
                    className="bg-transparent"
                  />
                </Field>
                <Field label="공개 상태">
                  <select
                    name="isPublished"
                    defaultValue="1"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#29292a] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="1">공개</option>
                    <option value="0">비공개</option>
                  </select>
                </Field>
                <div className="flex justify-start">
                  <Button type="submit" variant="ghostSolid">
                    저장
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="업로드한 교재 목록"
            right={<Badge tone={textbooks.length ? "neutral" : "muted"}>{textbooks.length}개</Badge>}
          />
          <CardBody>
            {textbooks.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-3 pr-3">제목</th>
                      <th className="py-3 pr-3">상태</th>
                      <th className="py-3 pr-3">아임웹 상품 매핑</th>
                      <th className="py-3 pr-3">파일</th>
                      <th className="py-3 pr-3">용량</th>
                      <th className="py-3 pr-3">업로드</th>
                      <th className="py-3 text-right" aria-label="액션" />
                    </tr>
                  </thead>
                  <tbody>
                    {textbooks.map((t) => (
                      <tr key={t.id} className="border-b border-white/10">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-white">{t.title}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <TextbookPublishedSelect textbookId={t.id} isPublished={t.isPublished} />
                        </td>
                        <td className="py-3 pr-3">
                          <form className="grid grid-cols-1 gap-2" action="/api/admin/textbooks/update-imweb" method="post">
                            <input type="hidden" name="textbookId" value={t.id} />
                            <div className="flex gap-2">
                              <Input
                                name="imwebProdCode"
                                defaultValue={t.imwebProdCode ?? ""}
                                placeholder="상품 코드 예: conphy2_1"
                                className="bg-transparent"
                              />
                              <Button type="submit" size="sm" variant="ghostSolid">
                                저장
                              </Button>
                            </div>
                            <p className="text-xs text-white/50">
                              설정하면 수강생은 “구매자만” 교재 다운로드/열람이 가능합니다.
                              <span className="ml-2">
                                <HelpTip text="교재도 아임웹 상품 코드로 구매자 매칭이 됩니다. 자동 발급을 위해서는 아임웹 웹훅 + 서버 환경변수 설정이 필요합니다." />
                              </span>
                            </p>
                          </form>
                        </td>
                        <td className="py-3 pr-3 text-white/70">{t.originalName}</td>
                        <td className="py-3 pr-3 text-white/60">{formatBytes(t.sizeBytes)}</td>
                        <td className="py-3 pr-3 text-white/60">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Button href={`/api/admin/textbooks/${t.id}/download`} size="sm" variant="ghost">
                              다운로드
                            </Button>
                            <form action={`/api/admin/textbooks/${t.id}/delete`} method="post">
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
              <p className="text-sm text-white/60">업로드된 교재가 없습니다.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}


