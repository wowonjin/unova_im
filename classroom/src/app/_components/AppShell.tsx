import Sidebar from "@/app/_components/Sidebar";
import AppShellClient from "@/app/_components/AppShellClient";
import { Suspense } from "react";
import SidebarSkeleton from "@/app/_components/SidebarSkeleton";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShellClient
      // Sidebar는 서버에서 DB/외부요청을 동반할 수 있어 페이지 전환을 통째로 막을 수 있습니다.
      // Suspense로 감싸서 전환은 즉시 진행하고, 사이드바는 준비되는 대로 채웁니다.
      sidebar={
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      }
      floatingButton={null}
    >
      {children}
    </AppShellClient>
  );
}


