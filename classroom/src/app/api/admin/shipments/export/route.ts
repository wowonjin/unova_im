import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

function normalizePhone(v: unknown): string {
  if (typeof v !== "string") return "";
  // Keep digits only so exported excel doesn't include hyphens/spaces.
  return v.replace(/\D/g, "");
}

function normalizeAddress(v: unknown): string {
  if (typeof v !== "string") return "";
  // Remove postal-code tokens like "[61409]" (common in KR addresses)
  return v
    .replace(/\[\s*\d{5}\s*\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDateKey(v: string | null): v is string {
  if (!v) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

function clampDateRange(fromKey: string, toKey: string, maxDays: number): { fromKey: string; toKey: string } {
  let from = fromKey;
  let to = toKey;
  if (from > to) [from, to] = [to, from];

  const fromStart = kstStartOfDay(from);
  const toStart = kstStartOfDay(to);
  const days = Math.floor((toStart.getTime() - fromStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days <= maxDays) return { fromKey: from, toKey: to };
  return { fromKey: from, toKey: addDaysKst(from, maxDays - 1) };
}

async function loadDeliveryMainTemplateWb(): Promise<XLSX.WorkBook | null> {
  const candidates = [
    // preferred: keep template under classroom/public so it is packaged for deployment
    path.join(process.cwd(), "public", "_templates", "deliverymain.xls"),
    path.join(process.cwd(), "public", "_templates", "deliverymain.xlsx"),
    // local dev fallbacks (repo root)
    path.join(process.cwd(), "..", "deliverymain.xls"),
    path.join(process.cwd(), "..", "deliverymain.xlsx"),
    path.join(process.cwd(), "deliverymain.xls"),
    path.join(process.cwd(), "deliverymain.xlsx"),
  ];

  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      return XLSX.read(buf, { type: "buffer" });
    } catch {
      // ignore and try next
    }
  }
  return null;
}

function ensureDeliveryMainHeader(ws: XLSX.WorkSheet) {
  // A~K (B,J intentionally blank) - match deliverymain.xls layout
  const header: Array<string> = [
    "수하인명",
    "",
    "수하인 주소",
    "수하인전화번호",
    "수하인핸드폰번호",
    "택배수량",
    "택배운임",
    "운임구분",
    "품목명",
    "",
    "배송메시지",
  ];
  for (let c = 0; c <= 10; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    // don't overwrite existing styled header cells if present
    if (ws[addr]) continue;
    ws[addr] = { t: "s", v: header[c] ?? "" };
  }

  if (!ws["!cols"]) {
    ws["!cols"] = [
      { wch: 12 }, // A 수하인명
      { wch: 2 },  // B 빈칸
      { wch: 60 }, // C 수하인 주소
      { wch: 16 }, // D 수하인전화번호
      { wch: 16 }, // E 수하인핸드폰번호
      { wch: 10 }, // F 택배수량
      { wch: 10 }, // G 택배운임
      { wch: 10 }, // H 운임구분
      { wch: 30 }, // I 품목명
      { wch: 2 },  // J 빈칸
      { wch: 30 }, // K 배송메시지
    ];
  }
}

const QuerySchema = z.object({
  // multi(권장): textbookIds=aaa,bbb / legacy: textbookId=aaa
  textbookIds: z.array(z.string().min(1)).min(1).max(50),
  date: z.enum(["today", "yesterday", "all", "range"]).optional().default("today"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  shippingFee: z.coerce.number().int().min(0).optional().default(3000),
  freightCode: z.string().min(1).max(20).optional().default("030"),
  message: z.string().max(200).optional().default("친절 배송 부탁드립니다."),
}).superRefine((v, ctx) => {
  if (v.date !== "range") return;
  if (!isDateKey(v.dateFrom ?? null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateFrom"], message: "dateFrom must be YYYY-MM-DD when date=range" });
  }
  if (!isDateKey(v.dateTo ?? null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateTo"], message: "dateTo must be YYYY-MM-DD when date=range" });
  }
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
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      shippingFee: url.searchParams.get("shippingFee") ?? undefined,
      freightCode: url.searchParams.get("freightCode") ?? undefined,
      message: url.searchParams.get("message") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const { textbookIds: selectedIds, date, dateFrom, dateTo, shippingFee, freightCode, message } = parsed.data;

    const todayKey = kstDateKey(new Date());
    const yesterdayKey = addDaysKst(todayKey, -1);
    const clamped = date === "range" ? clampDateRange(dateFrom!, dateTo!, 366) : null;
    const start =
      date === "today"
        ? kstStartOfDay(todayKey)
        : date === "yesterday"
          ? kstStartOfDay(yesterdayKey)
          : date === "range"
            ? kstStartOfDay(clamped!.fromKey)
            : null;
    const end =
      date === "today"
        ? kstStartOfDay(addDaysKst(todayKey, 1))
        : date === "yesterday"
          ? kstStartOfDay(todayKey)
          : date === "range"
            ? kstStartOfDay(addDaysKst(clamped!.toKey, 1))
            : null;

    const textbooks = await prisma.textbook.findMany({
      where: { ownerId: teacher.id },
      select: { id: true, title: true },
    });
    const titleByTextbookId = new Map(textbooks.map((t) => [t.id, t.title] as const));
    const selectedIdSet = new Set(selectedIds);

    const orderLimit = date === "range" || date === "all" ? 10000 : 2000;
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
      take: orderLimit,
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
        수하인주소: normalizeAddress([o.user.address || "", o.user.addressDetail || ""].join(" ").trim()),
        수하인전화번호: normalizePhone(o.user.phone),
        수하인핸드폰번호: normalizePhone(o.user.phone),
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

    const wb = (await loadDeliveryMainTemplateWb()) ?? XLSX.utils.book_new();
    const sheetName = wb.SheetNames[0] ?? "택배목록";
    const ws: XLSX.WorkSheet = wb.Sheets[sheetName] ?? XLSX.utils.aoa_to_sheet([]);

    ensureDeliveryMainHeader(ws);

    // Write rows into fixed columns A~K; keep B and J empty.
    // Data starts from row 2 (index 1). Row 1 (index 0) is header.
    for (let i = 0; i < rows.length; i++) {
      const r = i + 1;
      const row = rows[i] as any;
      const aoaRow: Array<string | number> = [
        String(row.수하인명 ?? ""),
        "", // B blank
        String(row.수하인주소 ?? ""),
        String(row.수하인전화번호 ?? ""), // keep as string to preserve leading zeros
        String(row.수하인핸드폰번호 ?? ""), // keep as string to preserve leading zeros
        Number(row.택배수량 ?? 1),
        Number(row.택배운임 ?? shippingFee),
        String(row.운임구분 ?? freightCode),
        String(row.품목명 ?? ""),
        "", // J blank
        String(row.배송메시지 ?? message),
      ];

      for (let c = 0; c <= 10; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const v = aoaRow[c];
        // Force phone columns to be text
        if (c === 3 || c === 4) {
          ws[addr] = { t: "s", v: String(v ?? "") };
          continue;
        }
        if (typeof v === "number" && Number.isFinite(v)) {
          ws[addr] = { t: "n", v };
        } else {
          ws[addr] = { t: "s", v: String(v ?? "") };
        }
      }
    }

    // Update sheet range to include A1:K{n}
    const endRow = Math.max(0, rows.length); // 0-based end row index
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: endRow, c: 10 } });

    if (!wb.Sheets[sheetName]) {
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    } else {
      wb.Sheets[sheetName] = ws;
    }
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

