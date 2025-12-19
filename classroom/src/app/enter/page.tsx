import { Badge, Button, Field, Input, PageHeader } from "@/app/_components/ui";

export default async function EnterPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const hasError = Boolean(sp.error);
  return (
    <div className="min-h-screen bg-[#1d1d1f] text-white">
      <div className="mx-auto max-w-xl px-4 py-16">
        <PageHeader title="강의 관리 플랫폼" description="선생님 이메일을 입력해 접속하세요." />

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <form action="/api/auth/enter" method="post" className="space-y-4">
            <Field label="이메일">
              <Input name="email" type="email" placeholder="admin@gmail.com" required />
            </Field>

            <Button type="submit">접속</Button>
          </form>

          <div className="mt-6">
            <div className="text-sm text-white/70">임시 허용 이메일</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "admin@gmail.com",
                "admin1@gmail.com",
                "admin2@gmail.com",
                "admin3@gmail.com",
                "admin4@gmail.com",
                "admin5@gmail.com",
                "admin6@gmail.com",
              ].map((e) => (
                <Badge key={e} tone="neutral">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* 에러 표시 (간단) */}
        {hasError ? <div className="mt-4 text-sm text-red-200/90">접속할 수 없는 이메일입니다.</div> : null}
      </div>
    </div>
  );
}


