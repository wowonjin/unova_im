import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import TeachersAdminClient from "./TeachersAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminTeachersPage() {
  await requireAdminUser();

  return (
    <AppShell>
      <TeachersAdminClient />
    </AppShell>
  );
}


