"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/app/_components/ui";

type Option = { id: string; title: string; originalName: string };

function parseMoney(s: string): number | null | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined; // empty => no change
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export default function AdminSaleProductRegisterClient({ textbooks }: { textbooks: Option[] }) {
  const router = useRouter();
  const [textbookIds, setTextbookIds] = useState<string[]>(() => (textbooks[0]?.id ? [textbooks[0].id] : []));
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [entitlementDays, setEntitlementDays] = useState("30");
  const [isPublished, setIsPublished] = useState(true);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    return textbooks.map((t) => ({
      ...t,
      label: `${t.title}${t.originalName ? ` (${t.originalName})` : ""}`,
    }));
  }, [textbooks]);

  async function submit() {
    setError(null);
    if (!textbookIds.length) {
      setError("등록된 교재를 1개 이상 선택해주세요.");
      return;
    }

    const p = parseMoney(price);
    if (p === undefined) {
      setError("판매가(원)를 입력해주세요.");
      return;
    }
    const op = parseMoney(originalPrice);
    const days = parseInt(entitlementDays.trim(), 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      setError("이용 기간(일)은 1~3650 사이여야 합니다.");
      return;
    }

    const update: Record<string, unknown> = {
      price: p,
      originalPrice: op === undefined ? undefined : op,
      entitlementDays: days,
      isPublished,
      isSoldOut,
    };
    if (productName.trim()) update.title = productName.trim();
    if (teacherName.trim()) update.teacherName = teacherName.trim();
    if (subjectName.trim()) update.subjectName = subjectName.trim();

    setBusy(true);
    try {
      const res = await fetch("/api/admin/textbooks/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", textbookIds, update }),
      });
      if (!res.ok) throw new Error("SAVE_FAILED");

      setProductName("");
      setPrice("");
      setOriginalPrice("");
      setTeacherName("");
      setSubjectName("");
      setEntitlementDays("30");
      setIsPublished(true);
      setIsSoldOut(false);
      router.refresh();
    } catch {
      setError("판매 물품 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1a1c]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-semibold text-white">판매 물품 등록</h2>
        <p className="mt-1 text-sm text-white/60">상품 코드를 입력하는 대신, 등록된 교재를 선택해 판매 설정을 합니다.</p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-12">
            <Field
              label="등록된 교재 선택(다중 선택)"
              hint={
                <span>
                  교재 등록에서 업로드한 교재 목록입니다.{" "}
                  <span className="text-white/40">(Ctrl/Shift로 여러 개 선택)</span>
                </span>
              }
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm text-white/60">
                  선택: <span className="text-white/85 font-medium">{textbookIds.length}</span>개
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTextbookIds(options.map((o) => o.id))}
                    disabled={options.length === 0}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextbookIds([])}
                    disabled={textbookIds.length === 0}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
                  >
                    선택 해제
                  </button>
                </div>
              </div>
              <select
                multiple
                value={textbookIds}
                onChange={(e) => {
                  const next = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
                  setTextbookIds(next);
                }}
                className="min-h-[160px] w-full rounded-xl border border-white/10 bg-[#131315] px-3 py-2 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="md:col-span-12">
            <Field
              label="판매 물품 이름(선택)"
              hint={
                textbookIds.length > 1
                  ? <span className="text-amber-400/80">⚠️ 여러 교재 선택 시 모두 같은 이름으로 변경됩니다.</span>
                  : "스토어에 표시될 상품명(빈 값이면 기존 이름 유지)"
              }
            >
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 2027 CONNECT 수학I"
                className="bg-transparent"
              />
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="판매가(원)" hint="스토어에 표시되는 가격">
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="예: 49000" className="bg-transparent" />
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="원가(원, 선택)" hint="할인율 표시용(선택)">
              <Input value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="예: 99000" className="bg-transparent" />
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="이용 기간(일)" hint="구매 후 다운로드 가능 기간">
              <Input value={entitlementDays} onChange={(e) => setEntitlementDays(e.target.value)} type="number" min={1} max={3650} className="bg-transparent" />
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="선생님 이름(선택)">
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="예: 홍길동" className="bg-transparent" />
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="과목명(선택)">
              <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="예: 수학" className="bg-transparent" />
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="공개 여부" hint="공개로 설정하면 스토어에 노출됩니다.">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 accent-white"
                />
                공개로 설정
              </label>
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="품절" hint="품절이면 상세 페이지는 유지되지만 구매 버튼이 비활성화됩니다.">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={isSoldOut}
                  onChange={(e) => setIsSoldOut(e.target.checked)}
                  className="h-4 w-4 accent-white"
                />
                품절로 설정
              </label>
            </Field>
          </div>
        </div>

        {error ? <div className="text-sm text-red-400">{error}</div> : null}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={busy || textbookIds.length === 0} onClick={submit}>
            {busy ? "저장 중..." : "판매 물품 추가"}
          </Button>
        </div>
      </div>
    </div>
  );
}

