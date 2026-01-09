import WithdrawClient from "./withdraw-client";

export default function MyPageWithdrawPage() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h1 className="text-[22px] font-bold text-red-200">회원 탈퇴</h1>
      <p className="text-[14px] text-white/60 mt-2">
        회원 탈퇴 시 계정 및 관련 데이터가 삭제될 수 있습니다. 신중히 진행해주세요.
      </p>
      <div className="mt-6">
        <WithdrawClient />
      </div>
    </div>
  );
}

