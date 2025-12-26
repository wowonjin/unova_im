import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import LandingHeader from "../_components/LandingHeader";
import FloatingKakaoButton from "../_components/FloatingKakaoButton";
import MyPageClient from "./MyPageClient";

export default async function MyPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login?redirect=/mypage");
  }

  return (
    <div className="min-h-screen bg-[#161616] text-white">
      <LandingHeader />
      <FloatingKakaoButton />

      <div className="pt-[100px] pb-20 px-4">
        <div className="mx-auto max-w-2xl">
          {/* 페이지 제목 */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold">마이페이지</h1>
            <p className="text-[14px] text-white/60 mt-2">
              회원 정보를 확인하고 관리하세요
            </p>
          </div>

          {/* 프로필 섹션 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontSize: "32px" }}>
                  person
                </span>
              </div>
              <div>
                <p className="text-[18px] font-bold">{user.name || "회원"}</p>
                <p className="text-[14px] text-white/60">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-[14px] text-white/60">이름</span>
                <span className="text-[14px]">{user.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-[14px] text-white/60">이메일</span>
                <span className="text-[14px]">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[14px] text-white/60">회원 유형</span>
                <span className="text-[14px]">일반 회원</span>
              </div>
            </div>
          </div>

          {/* 메뉴 섹션 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mb-6">
            <MenuLink
              href="/orders"
              icon="receipt_long"
              label="주문내역"
              description="구매한 교재 및 강의 확인"
            />
            <MenuLink
              href="/dashboard"
              icon="school"
              label="나의 강의실"
              description="수강 중인 강의 바로가기"
            />
            <MenuLink
              href="https://unova.co.kr"
              icon="shopping_cart"
              label="교재 및 강의 구매"
              description="유노바 스토어로 이동"
              external
            />
          </div>

          {/* 계정 관리 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-[13px] text-white/50 font-medium">계정 관리</p>
            </div>
            <MenuLink
              href="https://unova.co.kr"
              icon="edit"
              label="회원정보 수정"
              description="유노바 홈페이지에서 수정"
              external
            />
            <MenuLink
              href="https://unova.co.kr"
              icon="lock"
              label="비밀번호 변경"
              description="유노바 홈페이지에서 변경"
              external
            />
          </div>

          {/* 로그아웃 버튼 */}
          <MyPageClient />

          {/* 고객센터 */}
          <div className="mt-8 p-4 rounded-xl bg-white/5">
            <p className="text-[14px] font-medium mb-2">도움이 필요하신가요?</p>
            <p className="text-[13px] text-white/50">
              문의사항은 카카오톡 채널 또는 이메일(unova.team.cs@gmail.com)로 연락해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  description,
  external,
}: {
  href: string;
  icon: string;
  label: string;
  description: string;
  external?: boolean;
}) {
  const LinkComponent = external ? "a" : require("next/link").default;
  const linkProps = external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };

  return (
    <LinkComponent
      {...linkProps}
      className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-white/70" style={{ fontSize: "20px" }}>
            {icon}
          </span>
        </div>
        <div>
          <p className="text-[14px] font-medium">{label}</p>
          <p className="text-[12px] text-white/50">{description}</p>
        </div>
      </div>
      <span className="material-symbols-outlined text-white/30" style={{ fontSize: "20px" }}>
        chevron_right
      </span>
    </LinkComponent>
  );
}

