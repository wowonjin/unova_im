export default function SidebarSkeleton() {
  // SidebarClient의 실제 레이아웃과 완벽히 동일할 필요는 없고,
  // 페이지 전환 시 "즉시" 화면이 바뀌는 체감을 주는 게 목적입니다.
  return (
    <aside className="hidden lg:block w-[280px] shrink-0">
      <div className="h-full border-r border-white/10 bg-[#161616] px-4 py-4">
        <div className="space-y-4">
          <div className="h-10 rounded-xl bg-white/10" />
          <div className="h-24 rounded-2xl bg-white/5" />
          <div className="space-y-2">
            <div className="h-9 rounded-lg bg-white/5" />
            <div className="h-9 rounded-lg bg-white/5" />
            <div className="h-9 rounded-lg bg-white/5" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-5 w-24 rounded bg-white/5" />
            <div className="h-12 rounded-xl bg-white/5" />
            <div className="h-12 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    </aside>
  );
}

