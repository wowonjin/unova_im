import { Badge, Field, PageHeader } from "@/app/_components/ui";

const ALLOWED_EMAILS = [
  "admin@gmail.com",
  "admin1@gmail.com",
  "admin2@gmail.com",
  "admin3@gmail.com",
  "admin4@gmail.com",
  "admin5@gmail.com",
  "admin6@gmail.com",
];

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
        <PageHeader title="관리 플랫폼" description="선생님 이메일을 입력해 접속하세요." />

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <form action="/api/auth/enter" method="POST" className="space-y-4">
            <Field label="이메일">
              <input
                name="email"
                type="email"
                placeholder="admin@gmail.com"
                required
                className="h-10 w-full rounded-xl border border-white/10 bg-[#1d1d1f] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-white/10"
              />
            </Field>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 h-10 px-4 text-sm font-medium"
            >
              접속
            </button>
          </form>

          <div className="mt-6">
            <div className="text-sm text-white/70">임시 허용 이메일</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALLOWED_EMAILS.map((e) => (
                <Badge key={e} tone="neutral">
                  {e}
                </Badge>
              ))}
            </div>
          </div>

          {/* 에러 표시 (간단) */}
          {hasError ? (
            <div className="mt-4 text-sm text-red-200/90">접속할 수 없는 이메일입니다.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
