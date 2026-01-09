"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type User = { name: string | null; email: string };

const items = [
  { href: "/mypage/orders", label: "주문내역", icon: "receipt_long" },
  { href: "/mypage/edit", label: "정보 수정", icon: "edit" },
  { href: "/mypage/withdraw", label: "회원 탈퇴", icon: "person_remove" },
] as const;

export default function MyPageSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    // 컨테이너(카드) 느낌 제거: 배경/테두리 제거
    <aside className="h-fit">
      <div className="px-1 py-2">
        <p className="text-[15px] font-semibold">{user.name || "회원"}</p>
        <p className="text-[13px] text-white/50 mt-1 truncate">{user.email}</p>
      </div>

      <nav className="mt-2 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] transition-colors",
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                {it.icon}
              </span>
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}

        {/* 로그아웃: 회원 탈퇴 아래로 배치 */}
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className={[
            "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] transition-colors text-white/60 hover:bg-white/5 hover:text-white",
            "disabled:opacity-50",
          ].join(" ")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            logout
          </span>
          <span className="font-medium">{loggingOut ? "로그아웃 중..." : "로그아웃"}</span>
        </button>
      </nav>
    </aside>
  );
}

