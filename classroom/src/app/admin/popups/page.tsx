import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import PopupsClient from "./PopupsClient";

export default async function AdminPopupsPage() {
  await requireAdminUser();

  return (
    <AppShell>
      <PopupsClient />
    </AppShell>
  );
}
