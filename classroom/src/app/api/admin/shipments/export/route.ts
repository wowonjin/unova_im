import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function kstDateKey(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function kstStartOfDay(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
}

function addDaysKst(dateKey: string, days: number): string {
  const base = kstStartOfDay(dateKey);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return kstDateKey(next);
}

type LineItem = { productType: "COURSE" | "TEXTBOOK"; productId: string; amount?: number };

function extractLineItems(payload: unknown): LineItem[] | null {
  if (!payload || typeof payload !== "object") return null;
  const anyPayload = payload as any;
  const items = anyPayload?.lineItems?.items;
  if (!Array.isArray(items)) return null;
  const normalized = items
    .map((it: any) => ({
      productType: it?.productType === "COURSE" ? "COURSE" : it?.productType === "TEXTBOOK" ? "TEXTBOOK" : null,
      productId: typeof it?.productId === "string" ? it.productId : null,
      amount: Number(it?.amount ?? 0),
    }))
    .filter((it: any) => it.productType && it.productId);
  return normalized.length ? (normalized as LineItem[]) : null;
}

function parseCsvIds(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

const QuerySchema = z.object({
  // multi(권장): textbookIds=aaa,bbb / legacy: textbookId=aaa
  textbookIds: z.array(z.string().min(1)).min(1).max(50),
  date: z.enum(["today", "all"]).optional().default("today"),
  shippingFee: z.coerce.number().int().min(0).optional().default(3000),
  freightCode: z.string().min(1).max(20).optional().default("030"),
  message: z.string().max(200).optional().default("친절 배송 부탁드립니다."),
});

export async function GET(req: Request) {
  try {
    const teacher = await requireAdminUser();
    const url = new URL(req.url);
    const legacyOne = url.searchParams.get("textbookId");
    const ids = parseCsvIds(url.searchParams.get("textbookIds"));
    const textbookIds = ids.length ? ids : (legacyOne ? [legacyOne] : []);
    const parsed = QuerySchema.safeParse({
      textbookIds,
      date: (url.searchParams.get("date") ?? undefined) as any,
      shippingFee: url.searchParams.get("shippingFee") ?? undefined,
      freightCode: url.searchParams.get("freightCode") ?? undefined,
      message: url.searchParams.get("message") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const { textbookIds: selectedIds, date, shippingFee, freightCode, message } = parsed.data;

    const todayKey = kstDateKey(new Date());
    const start = date === "today" ? kstStartOfDay(todayKey) : null;
    const end = date === "today" ? kstStartOfDay(addDaysKst(todayKey, 1)) : null;

    const textbooks = await prisma.textbook.findMany({
      where: { ownerId: teacher.id },
      select: { id: true, title: true },
    });
    const titleByTextbookId = new Map(textbooks.map((t) => [t.id, t.title] as const));
    const selectedIdSet = new Set(selectedIds);

    const orders = await prisma.order.findMany({
      where: {
        NOT: { status: "PENDING" },
        ...(start && end ? { createdAt: { gte: start, lt: end } } : {}),
        OR: [
          { course: { ownerId: teacher.id } },
          { textbook: { ownerId: teacher.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        orderNo: true,
        productName: true,
        textbookId: true,
        providerPayload: true,
        createdAt: true,
        user: { select: { name: true, email: true, phone: true, address: true, addressDetail: true } },
      },
    });

    const rows = orders.flatMap((o) => {
      const out: Array<Record<string, string | number>> = [];

      const base = {
        수하인명: o.user.name || o.user.email,
        수하인주소: [o.user.address || "", o.user.addressDetail || ""].join(" ").trim(),
        수하인전화번호: o.user.phone || "",
        수하인핸드폰번호: o.user.phone || "",
        택배수량: 1,
        택배운임: shippingFee,
        운임구분: freightCode,
        배송메시지: message,
      };

      // 1) 단일 상품 주문
      if (o.textbookId && selectedIdSet.has(o.textbookId)) {
        out.push({
          ...base,
          품목명: titleByTextbookId.get(o.textbookId) || o.productName,
        });
        return out;
      }

      // 2) 다중 상품 주문(providerPayload.lineItems.items)
      const items = extractLineItems(o.providerPayload);
      if (!items?.length) return out;
      for (const it of items) {
        if (it.productType !== "TEXTBOOK") continue;
        if (!selectedIdSet.has(it.productId)) continue;
        out.push({
          ...base,
          품목명: titleByTextbookId.get(it.productId) || o.productName,
        });
      }
      return out;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 열 너비(대략)
    ws["!cols"] = [
      { wch: 12 }, // 수하인명
      { wch: 60 }, // 주소
      { wch: 16 }, // 전화
      { wch: 16 }, // 핸드폰
      { wch: 10 }, // 수량
      { wch: 10 }, // 운임
      { wch: 10 }, // 운임구분
      { wch: 30 }, // 품목명
      { wch: 30 }, // 배송메시지
    ];

    XLSX.utils.book_append_sheet(wb, ws, "택배목록");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const dateStr = kstDateKey(new Date()).replace(/-/g, "");
    const baseName = (selectedIds.length === 1 ? (titleByTextbookId.get(selectedIds[0]!) || "택배목록") : "택배목록")
      .replace(/[\\/:*?"<>|]+/g, "")
      .slice(0, 40);
    const filename = `${baseName}_${dateStr}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Shipments export error:", error);
    return NextResponse.json({ ok: false, error: "EXPORT_FAILED" }, { status: 500 });
  }
}

