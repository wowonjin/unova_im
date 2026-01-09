import type { Prisma } from "@prisma/client";

export type OrderView = {
  id: string;
  date: string;
  items: { name: string; price: number; href?: string }[];
  total: number;
  status: string;
};

export function mapOrderStatusToLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "결제대기";
    case "COMPLETED":
      return "결제완료";
    case "CANCELLED":
      return "취소";
    case "REFUNDED":
      return "환불";
    case "PARTIALLY_REFUNDED":
      return "부분환불";
    default:
      return status;
  }
}

export function formatOrderDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function extractLineItemsFromProviderPayload(
  payload: Prisma.JsonValue | unknown
): Array<{ name: string; price: number }> | null {
  if (!payload || typeof payload !== "object") return null;
  const anyPayload = payload as any;
  const items = anyPayload?.lineItems?.items;
  if (!Array.isArray(items)) return null;

  const normalized = items
    .map((it: any) => ({
      name: String(it?.productName ?? it?.name ?? "").trim(),
      price: Number(it?.amount ?? it?.price ?? 0),
    }))
    .filter((it: { name: string; price: number }) => it.name.length > 0 && Number.isFinite(it.price));

  return normalized.length > 0 ? normalized : null;
}

