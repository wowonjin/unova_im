import Sidebar from "@/app/_components/Sidebar";
import FloatingKakaoButton from "@/app/_components/FloatingKakaoButton";
import AppShellClient from "@/app/_components/AppShellClient";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShellClient
      sidebar={<Sidebar />}
      floatingButton={<FloatingKakaoButton />}
    >
      {children}
    </AppShellClient>
  );
}


