import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import SubscriptionBillingSuccessClient from "./SubscriptionBillingSuccessClient";

export default async function SubscriptionBillingSuccessPage() {
  await requireAdminUser();
  return (
    <AppShell>
      <SubscriptionBillingSuccessClient />
    </AppShell>
  );
}
