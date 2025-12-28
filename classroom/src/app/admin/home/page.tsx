import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import HomeSettingsClient from "./HomeSettingsClient";

export default async function AdminHomeSettingsPage() {
  await requireAdminUser();

  return (
    <AppShell>
      <HomeSettingsClient />
    </AppShell>
  );
}


