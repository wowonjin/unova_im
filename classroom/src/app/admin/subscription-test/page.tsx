import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import SubscriptionTestClient from "./SubscriptionTestClient";

export default async function AdminSubscriptionTestPage() {
  const admin = await requireAdminUser();

  return (
    <AppShell>
      <SubscriptionTestClient adminEmail={admin.email} adminName={admin.name ?? "관리자"} />
    </AppShell>
  );
}
