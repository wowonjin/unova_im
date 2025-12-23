import Sidebar from "@/app/_components/Sidebar";
import FloatingKakaoButton from "@/app/_components/FloatingKakaoButton";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1d1d1f] text-white">
      {/* 상단 고정 헤더 높이만큼 여백 확보 (모바일만) */}
      <div className="flex min-h-screen pt-28 md:pt-0">
        <Sidebar />
        <main className="flex-1 px-4 pb-6 pt-6 md:px-8 md:py-6">{children}</main>
      </div>
      <FloatingKakaoButton />
    </div>
  );
}


