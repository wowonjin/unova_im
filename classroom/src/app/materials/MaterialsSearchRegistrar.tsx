"use client";

import { useEffect } from "react";
import { useClassroomSearch, ClassroomSearchItem } from "@/app/_components/ClassroomSearchContext";

export default function MaterialsSearchRegistrar({ items }: { items: ClassroomSearchItem[] }) {
  const { setItemsForKey, clearKey } = useClassroomSearch();

  useEffect(() => {
    setItemsForKey("materials", items);
    return () => clearKey("materials");
  }, [items, setItemsForKey, clearKey]);

  return null;
}

