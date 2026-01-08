"use client";

import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type ClassroomSearchItem = {
  id: string;
  title: string;
  href: string;
  type: "textbook" | "lesson" | "course";
  subtitle?: string | null;
};

type ClassroomSearchContextValue = {
  items: ClassroomSearchItem[];
  setItemsForKey: (key: string, items: ClassroomSearchItem[]) => void;
  clearKey: (key: string) => void;
  clearAll: () => void;
};

const Ctx = createContext<ClassroomSearchContextValue | null>(null);

export function ClassroomSearchProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [registry, setRegistry] = useState<Record<string, ClassroomSearchItem[]>>({});

  const setItemsForKey = useCallback((key: string, next: ClassroomSearchItem[]) => {
    const k = String(key || "").trim() || "default";
    setRegistry((prev) => ({ ...prev, [k]: Array.isArray(next) ? next : [] }));
  }, []);

  const clearKey = useCallback((key: string) => {
    const k = String(key || "").trim() || "default";
    setRegistry((prev) => {
      if (!prev[k]) return prev;
      const { [k]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAll = useCallback(() => setRegistry({}), []);

  // 라우트가 바뀌면 이전 화면의 검색 대상은 제거
  // useLayoutEffect로 먼저 비우고(레이스 방지), 각 화면 registrar가 useEffect로 다시 채웁니다.
  useLayoutEffect(() => {
    clearAll();
  }, [pathname, clearAll]);

  const items = useMemo(() => Object.values(registry).flat(), [registry]);
  const value = useMemo(
    () => ({ items, setItemsForKey, clearKey, clearAll }),
    [items, setItemsForKey, clearKey, clearAll]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClassroomSearch() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useClassroomSearch must be used within ClassroomSearchProvider");
  return v;
}

