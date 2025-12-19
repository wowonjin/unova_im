import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Field, Input, PageHeader, Textarea } from "@/app/_components/ui";

export default async function AdminPage() {
  const teacher = await requireAdminUser();

  const courses = await prisma.course.findMany({
    where: { ownerId: teacher.id },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      lessons: { select: { id: true, isPublished: true } },
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="강의 관리 플랫폼"
        right={
          <Button href="/admin/events" variant="secondary">
            웹훅/이벤트 로그
          </Button>
        }
      />

      <div className="mt-6">
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-12"
            action="/api/admin/courses/create"
            method="post"
            encType="multipart/form-data"
          >
            <div className="md:col-span-6">
              <Field label="강좌 제목">
                <Input name="title" required placeholder="예: [2027] 김OO T 커넥트 수학" />
              </Field>
            </div>
            <div className="md:col-span-6">
              <Field label="썸네일(선택)">
                <input className="block w-full text-sm" type="file" name="thumbnail" accept="image/*" />
              </Field>
            </div>

            {/* 강좌 소개 입력 제거 */}

            <div className="md:col-span-12 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" name="isPublished" defaultChecked />
                공개
              </label>
              <Button type="submit">새 강좌 만들기</Button>
            </div>
          </form>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 pr-3">제목</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">차시(공개/전체)</th>
                <th className="py-3 pr-3">slug</th>
                <th className="px-5 py-3 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const publishedLessons = c.lessons.filter((l) => l.isPublished).length;
                return (
                  <tr key={c.id} className="border-b border-white/10">
                    <td className="px-5 py-3 pr-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{c.title}</div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone={c.isPublished ? "neutral" : "muted"}>{c.isPublished ? "공개" : "비공개"}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-white/70">
                      {publishedLessons}/{c.lessons.length}
                    </td>
                    <td className="py-3 pr-3 text-white/60">{c.slug}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button href={`/course/${c.id}`} variant="secondary" size="sm">
                          미리보기
                        </Button>
                        <Button href={`/admin/course/${c.id}`} size="sm">
                          관리
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}


