import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { Button, Card, CardBody, CardHeader, PageHeader } from "@/app/_components/ui";

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <AppShell>
      <PageHeader
        title="관리 플랫폼"
        right={
          <Button href="/admin/events" variant="secondary">
            웹훅/이벤트 로그
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="bg-transparent">
          <CardHeader title="교재" />
              <CardBody>
            <p className="text-sm text-white/70">교재 업로드/공개 설정/다운로드/삭제</p>
            <div className="mt-4">
              <Button href="/admin/textbooks" variant="ghostSolid">
                교재 관리하기
                    </Button>
                  </div>
            </CardBody>
          </Card>

            <Card className="bg-transparent">
          <CardHeader title="강좌" />
              <CardBody>
            <p className="text-sm text-white/70">강좌 생성/공개 설정/차시 관리</p>
            <div className="mt-4">
              <Button href="/admin/courses" variant="ghostSolid">
                강좌 관리하기
                    </Button>
                  </div>
              </CardBody>
            </Card>
      </div>
    </AppShell>
  );
}


