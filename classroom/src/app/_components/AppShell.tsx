import Sidebar from "@/app/_components/Sidebar";
import AppShellClient from "@/app/_components/AppShellClient";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShellClient
      sidebar={<Sidebar />}
      floatingButton={null}
    >
      {children}
    </AppShellClient>
  );
}


