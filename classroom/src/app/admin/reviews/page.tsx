import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import ReviewsAdminClient from "./reviewsAdminClient";

export default async function AdminReviewsPage() {
  await requireAdminUser();

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight">후기 관리</h1>
          <p className="mt-2 text-white/50">새로 등록되는 후기가 실시간으로 갱신됩니다.</p>
        </div>
        <ReviewsAdminClient />
      </div>
    </AppShell>
  );
}


