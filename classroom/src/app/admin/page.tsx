import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const adminMenus = [
  {
    title: "메인페이지 설정",
    description: "메인 슬라이드/바로가기 아이콘 관리",
    href: "/admin/home",
    icon: "tune",
    color: "from-fuchsia-500/20 to-fuchsia-600/20",
    iconColor: "text-fuchsia-300",
  },
  {
    title: "교재 관리",
    description: "교재 업로드, 공개 설정, 다운로드 관리",
    href: "/admin/textbooks",
    icon: "menu_book",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-400",
  },
  {
    title: "강좌 관리",
    description: "강좌 생성, 차시 관리, 공개 설정",
    href: "/admin/courses",
    icon: "video_library",
    color: "from-purple-500/20 to-purple-600/20",
    iconColor: "text-purple-400",
  },
  {
    title: "회원 관리",
    description: "전체 회원 목록, 수강 현황, 권한 관리",
    href: "/admin/members",
    icon: "group",
    color: "from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-400",
  },
  {
    title: "주문 관리",
    description: "결제된 주문 목록, 주문 상태 관리",
    href: "/admin/orders",
    icon: "receipt_long",
    color: "from-rose-500/20 to-rose-600/20",
    iconColor: "text-rose-400",
  },
  {
    title: "팝업 관리",
    description: "메인페이지 팝업 등록 및 관리",
    href: "/admin/popups",
    icon: "web_asset",
    color: "from-cyan-500/20 to-cyan-600/20",
    iconColor: "text-cyan-400",
  },
  {
    title: "후기 관리",
    description: "전체 후기 목록 확인 및 삭제",
    href: "/admin/reviews",
    icon: "rate_review",
    color: "from-indigo-500/20 to-indigo-600/20",
    iconColor: "text-indigo-300",
  },
  {
    title: "선생님 관리",
    description: "Teachers 페이지에 노출할 선생님 목록 관리",
    href: "/admin/teachers",
    icon: "badge",
    color: "from-slate-500/20 to-slate-600/20",
    iconColor: "text-slate-300",
  },
];

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtRating(v: number | null | undefined) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n.toFixed(1);
}

export default async function AdminPage() {
  await requireAdminUser();

  // NOTE: 후기 관련 상세 섹션은 /admin/reviews 로 이동했습니다.
  const [publishedCoursesCount, publishedTextbooksCount] = await Promise.all([
    prisma.course.count({ where: { isPublished: true } }),
    prisma.textbook.count({ where: { isPublished: true } }),
  ]);
  const totalPublished = publishedCoursesCount + publishedTextbooksCount;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-[32px] font-bold tracking-tight">관리자 대시보드</h1>
          <p className="mt-2 text-white/50">유노바 강의실 관리 페이지입니다.</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">판매중 상품(공개)</p>
            <p className="text-[28px] font-bold">{totalPublished}</p>
            <p className="mt-1 text-[12px] text-white/35">강좌 {publishedCoursesCount} · 교재 {publishedTextbooksCount}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">승인된 후기</p>
            <p className="text-[28px] font-bold">-</p>
            <p className="mt-1 text-[12px] text-white/35">자세한 현황은 후기 관리</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">평균 평점</p>
            <p className="text-[28px] font-bold">-</p>
            <p className="mt-1 text-[12px] text-white/35">후기 관리에서 확인</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[13px] text-white/40 mb-1">후기 관리</p>
            <Link
              href="/admin/reviews"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-[13px] text-white/85 hover:bg-white/[0.1]"
            >
              후기 전체 보기
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                arrow_forward
              </span>
            </Link>
          </div>
                  </div>

        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminMenus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="group p-6 rounded-2xl bg-gradient-to-br border border-white/[0.06] transition-all hover:border-white/[0.12] hover:scale-[1.02]"
              style={{
                backgroundImage: `linear-gradient(to bottom right, ${menu.color.split(" ")[0].replace("from-", "")}, ${menu.color.split(" ")[1].replace("to-", "")})`,
              }}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4`}
              >
                <span
                  className={`material-symbols-outlined ${menu.iconColor}`}
                  style={{ fontSize: "24px" }}
                >
                  {menu.icon}
                </span>
              </div>
              <h3 className="text-[18px] font-semibold text-white group-hover:text-white/90">
                {menu.title}
              </h3>
              <p className="mt-1 text-[14px] text-white/50">{menu.description}</p>
            </Link>
          ))}
                  </div>
      </div>
    </AppShell>
  );
}
