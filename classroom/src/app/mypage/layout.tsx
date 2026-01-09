import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import LandingHeader from "../_components/LandingHeader";
import FloatingKakaoButton from "../_components/FloatingKakaoButton";
import MyPageSidebar from "./_components/MyPageSidebar";

export default async function MyPageLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/mypage");

  return (
    <div className="min-h-screen bg-[#161616] text-white">
      <LandingHeader />
      <FloatingKakaoButton />

      <div className="pt-[100px] pb-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
            <MyPageSidebar user={{ name: user.name, email: user.email }} />
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

