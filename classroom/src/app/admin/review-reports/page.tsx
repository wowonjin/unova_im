import ReviewsReportsAdminClient from "./reviewsReportsAdminClient";

export default function ReviewReportsAdminPage() {
  return (
    <main className="min-h-screen bg-[#161616] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-[22px] font-bold">리뷰 신고</h1>
        <p className="mt-2 text-sm text-white/50">최근 신고 내역을 확인합니다.</p>
        <div className="mt-6">
          <ReviewsReportsAdminClient />
        </div>
      </div>
    </main>
  );
}

