"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  addressDetail: string;
  birthday: string;
};

export default function ProfileEditForm({ initial }: { initial: FormState }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initial);

  const birthdayHelp = useMemo(() => "YYYY-MM-DD 형식 (예: 2005-03-21)", []);

  const onChange = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          addressDetail: form.addressDetail,
          birthday: form.birthday,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "저장에 실패했습니다.");
        return;
      }
      setOkMsg("저장되었습니다.");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">{error}</div>}
      {okMsg && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-[13px] text-green-200">{okMsg}</div>}

      <Field label="이메일(변경 불가)">
        <input
          value={form.email}
          disabled
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white/60 disabled:opacity-80"
        />
      </Field>

      <Field label="이름">
        <input
          value={form.name}
          onChange={onChange("name")}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none focus:border-white/30"
          placeholder="이름"
        />
      </Field>

      <Field label="연락처">
        <input
          value={form.phone}
          onChange={onChange("phone")}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none focus:border-white/30"
          placeholder="예: 010-1234-5678"
        />
      </Field>

      <Field label="주소">
        <input
          value={form.address}
          onChange={onChange("address")}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none focus:border-white/30"
          placeholder="주소"
        />
      </Field>

      <Field label="상세주소">
        <input
          value={form.addressDetail}
          onChange={onChange("addressDetail")}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none focus:border-white/30"
          placeholder="상세주소"
        />
      </Field>

      <Field label="생년월일">
        <input
          value={form.birthday}
          onChange={onChange("birthday")}
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white outline-none focus:border-white/30"
          placeholder="YYYY-MM-DD"
        />
        <p className="mt-2 text-[12px] text-white/45">{birthdayHelp}</p>
      </Field>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] text-white/60 mb-2">{label}</p>
      {children}
    </div>
  );
}

