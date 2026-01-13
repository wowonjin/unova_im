"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TextbookOption = { id: string; title: string };

type Filters = {
  textbookIds: string[];
  date: "today" | "all";
  shippingFee: string;
  freightCode: string;
  message: string;
};

const STORAGE_KEY = "unova.admin.shipments.filters.v1";

function safeParseJson(s: string | null): any {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function clampString(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function readStoredFilters(): Filters | null {
  if (typeof window === "undefined") return null;
  const raw = safeParseJson(window.localStorage.getItem(STORAGE_KEY));
  if (!raw || typeof raw !== "object") return null;
  const date = raw.date === "all" ? "all" : "today";
  const textbookIdsRaw = Array.isArray((raw as any).textbookIds) ? (raw as any).textbookIds : [];
  const textbookIds = textbookIdsRaw
    .map((x: any) => (typeof x === "string" ? x.trim() : ""))
    .filter((x: string) => x.length > 0)
    .slice(0, 50);
  return {
    textbookIds,
    date,
    shippingFee: clampString(raw.shippingFee, 10),
    freightCode: clampString(raw.freightCode, 20) || "030",
    message: clampString(raw.message, 200) || "친절 배송 부탁드립니다.",
  };
}

function writeStoredFilters(f: Filters) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      textbookIds: f.textbookIds,
      date: f.date,
      shippingFee: f.shippingFee,
      freightCode: f.freightCode,
      message: f.message,
      savedAt: new Date().toISOString(),
    })
  );
}

function buildQuery(f: Filters) {
  const sp = new URLSearchParams();
  if (f.textbookIds.length > 0) sp.set("textbookIds", f.textbookIds.join(","));
  sp.set("date", f.date);
  if (f.shippingFee) sp.set("shippingFee", f.shippingFee);
  if (f.freightCode) sp.set("freightCode", f.freightCode);
  if (f.message) sp.set("message", f.message);
  return sp;
}

export default function ShipmentsFiltersClient({
  textbooks,
  initial,
}: {
  textbooks: TextbookOption[];
  initial: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const validTextbookIds = useMemo(() => new Set(textbooks.map((t) => t.id)), [textbooks]);

  const [form, setForm] = useState<Filters>(initial);
  const [q, setQ] = useState("");
  const [productPanelOpen, setProductPanelOpen] = useState(true);

  // 변경 즉시 저장(페이지 이동/새로고침해도 선택 유지)
  useEffect(() => {
    const safe: Filters = {
      ...form,
      textbookIds: (Array.isArray(form.textbookIds) ? form.textbookIds : []).filter((id) => validTextbookIds.has(id)).slice(0, 50),
      date: form.date === "all" ? "all" : "today",
    };
    writeStoredFilters(safe);
  }, [form, validTextbookIds]);

  // URL에 교재 선택값이 없으면, 저장된 교재 선택값을 자동 복원
  useEffect(() => {
    const hasTextbooks = Boolean(searchParams.get("textbookIds")) || Boolean(searchParams.get("textbookId"));
    if (hasTextbooks) return;

    const stored = readStoredFilters();
    if (!stored) return;
    if (stored.textbookIds.some((id) => !validTextbookIds.has(id))) return;

    const merged: Filters = {
      ...stored,
      date: (searchParams.get("date") === "all" ? "all" : stored.date) as "today" | "all",
      shippingFee: searchParams.get("shippingFee") ?? stored.shippingFee,
      freightCode: searchParams.get("freightCode") ?? stored.freightCode,
      message: searchParams.get("message") ?? stored.message,
    };

    setForm(merged);
    const q = buildQuery(merged);
    router.replace(`${pathname}?${q.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, searchParams, validTextbookIds]);

  const onChange = (key: keyof Omit<Filters, "textbookIds">) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...form, [key]: e.target.value } as Filters;
    setForm(next);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return textbooks;
    return textbooks.filter((t) => t.title.toLowerCase().includes(query));
  }, [q, textbooks]);

  const selectedSet = useMemo(() => new Set(form.textbookIds), [form.textbookIds]);

  const handleApply = () => {
    const safe: Filters = {
      ...form,
      textbookIds: (Array.isArray(form.textbookIds) ? form.textbookIds : []).filter((id) => validTextbookIds.has(id)).slice(0, 50),
      date: form.date === "all" ? "all" : "today",
    };
    writeStoredFilters(safe);
    const q = buildQuery(safe);
    router.push(`${pathname}?${q.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* 상품 선택 패널 */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden">
        <button
          type="button"
          onClick={() => setProductPanelOpen(!productPanelOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-400" style={{ fontSize: "18px" }}>
                inventory_2
              </span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-medium text-white">상품 선택</p>
              <p className="text-[12px] text-white/50">
                {form.textbookIds.length === 0
                  ? "선택된 상품 없음"
                  : `${form.textbookIds.length}개 상품 선택됨`}
              </p>
            </div>
          </div>
          <span
            className="material-symbols-outlined text-white/40 transition-transform"
            style={{ fontSize: "20px", transform: productPanelOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            expand_more
          </span>
        </button>

        {productPanelOpen && (
          <div className="px-5 pb-5 border-t border-white/[0.06]">
            <div className="pt-4">
              {/* 검색바 */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30" style={{ fontSize: "18px" }}>
                  search
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="상품명으로 검색..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
                />
              </div>

              {/* 빠른 선택 버튼 */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ids = textbooks.map((t) => t.id);
                    setForm((prev) => ({ ...prev, textbookIds: ids }));
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    select_all
                  </span>
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, textbookIds: [] }))}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    deselect
                  </span>
                  선택 해제
                </button>
              </div>

              {/* 상품 리스트 */}
              <div className="mt-3 max-h-[200px] overflow-auto rounded-xl border border-white/[0.06] bg-[#0a0a0b]">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <span className="material-symbols-outlined text-white/15" style={{ fontSize: "32px" }}>
                      search_off
                    </span>
                    <p className="mt-2 text-[13px] text-white/40">검색 결과가 없습니다</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {filtered.map((t) => {
                      const checked = selectedSet.has(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                            checked ? "bg-blue-500/10" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              checked
                                ? "border-blue-500 bg-blue-500"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {checked && (
                              <span className="material-symbols-outlined text-white" style={{ fontSize: "14px" }}>
                                check
                              </span>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextChecked = e.target.checked;
                              setForm((prev) => {
                                const cur = new Set(prev.textbookIds);
                                if (nextChecked) cur.add(t.id);
                                else cur.delete(t.id);
                                return { ...prev, textbookIds: Array.from(cur) };
                              });
                            }}
                            className="sr-only"
                          />
                          <span className={`text-[13px] ${checked ? "text-white" : "text-white/70"}`}>
                            {t.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-white/30">
                판매중(가격 설정 + 공개)인 교재만 노출됩니다
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 필터 옵션 */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: "18px" }}>
              tune
            </span>
          </div>
          <div>
            <p className="text-[14px] font-medium text-white">배송 설정</p>
            <p className="text-[12px] text-white/50">엑셀에 적용될 기본값을 설정합니다</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">기간 필터</label>
            <select
              name="date"
              value={form.date}
              onChange={onChange("date")}
              style={{ colorScheme: "dark" }}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-white/20 transition-all"
            >
              <option value="today" className="bg-[#141416] text-white">오늘 (KST)</option>
              <option value="all" className="bg-[#141416] text-white">전체 기간</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">택배운임</label>
            <input
              name="shippingFee"
              type="number"
              value={form.shippingFee}
              onChange={onChange("shippingFee")}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-white/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">운임구분</label>
            <input
              name="freightCode"
              value={form.freightCode}
              onChange={onChange("freightCode")}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-white/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">배송메시지</label>
            <input
              name="message"
              value={form.message}
              onChange={onChange("message")}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-white/20 transition-all"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-medium text-black hover:bg-white/90 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              check
            </span>
            필터 적용
          </button>
        </div>
      </div>
    </div>
  );
}
