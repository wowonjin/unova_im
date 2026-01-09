"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

type Props = {
  isAdmin: boolean;
  defaultCategory: string;
  categorySuggestions: string[];
  selectedCategory?: string;
};

export default function AdminNoticeComposerClient({
  isAdmin,
  defaultCategory,
  categorySuggestions,
  selectedCategory,
}: Props) {
  const router = useRouter();

  const normalizeCategory = (s: string) => (s || "").replace(/\s+/g, " ").trim().normalize("NFC");

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const raw of categorySuggestions || []) {
      if (typeof raw !== "string") continue;
      const norm = normalizeCategory(raw);
      if (!norm) continue;
      if (!map.has(norm)) map.set(norm, norm);
    }
    return Array.from(map.values());
  }, [categorySuggestions]);

  const getPreferredCategory = () => {
    const sel = typeof selectedCategory === "string" ? normalizeCategory(selectedCategory) : "";
    if (sel && categoryOptions.includes(sel)) return sel;
    const def = normalizeCategory(defaultCategory || "");
    if (def && categoryOptions.includes(def)) return def;
    return categoryOptions[0] ?? "";
  };

  if (!isAdmin) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const preferred = getPreferredCategory();
        const qs = preferred ? `?cat=${encodeURIComponent(preferred)}` : "";
        router.push(`/notices/new${qs}`);
      }}
      className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
    >
      글 작성하기
    </button>
  );
}


