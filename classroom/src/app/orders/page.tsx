import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import LandingHeader from "../_components/LandingHeader";
import FloatingKakaoButton from "../_components/FloatingKakaoButton";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login?redirect=/orders");
  }

  // 임시 주문 데이터 (실제로는 DB에서 가져와야 함)
  const orders = [
    {
      id: "ORD-2024-001",
      date: "2024-12-20",
      items: [
        { name: "CONNECT 수학I+수학II+미적분 (책+PDF)", price: 95000 },
      ],
      total: 95000,
      status: "배송완료",
    },
    {
      id: "ORD-2024-002",
      date: "2024-12-15",
      items: [
        { name: "CONNECT 물리학II 전체강의", price: 250000 },
      ],
      total: 250000,
      status: "수강중",
    },
  ];

  return (
    <div className="min-h-screen bg-[#161616] text-white">
      <LandingHeader />
      <FloatingKakaoButton />

      <div className="pt-[100px] pb-20 px-4">
        <div className="mx-auto max-w-4xl">
          {/* 페이지 제목 */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold">주문내역</h1>
            <p className="text-[14px] text-white/60 mt-2">
              구매하신 상품 및 강의 내역을 확인하세요
            </p>
          </div>

          {/* 주문 목록 */}
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
                >
                  {/* 주문 헤더 */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <div>
                      <p className="text-[13px] text-white/50">주문번호</p>
                      <p className="text-[15px] font-medium">{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] text-white/50">주문일자</p>
                      <p className="text-[15px]">{order.date}</p>
                    </div>
                  </div>

                  {/* 주문 상품 */}
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/60" style={{ fontSize: "20px" }}>
                            menu_book
                          </span>
                        </div>
                        <p className="text-[14px]">{item.name}</p>
                      </div>
                      <p className="text-[14px] font-medium">
                        {item.price.toLocaleString()}원
                      </p>
                    </div>
                  ))}

                  {/* 주문 푸터 */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[12px] font-medium ${
                          order.status === "배송완료"
                            ? "bg-green-500/20 text-green-400"
                            : order.status === "수강중"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] text-white/50">총 결제금액</p>
                      <p className="text-[18px] font-bold">
                        {order.total.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-white/20" style={{ fontSize: "64px" }}>
                shopping_bag
              </span>
              <p className="mt-4 text-white/50">주문내역이 없습니다</p>
              <Link
                href="https://unova.co.kr"
                target="_blank"
                className="inline-block mt-6 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
              >
                교재 및 강의 구매하기
              </Link>
            </div>
          )}

          {/* 안내 문구 */}
          <div className="mt-8 p-4 rounded-xl bg-white/5 text-[13px] text-white/50">
            <p>• 실물 교재의 배송 조회는 유노바 홈페이지에서 확인하실 수 있습니다.</p>
            <p className="mt-1">• 강의 수강 관련 문의는 카카오톡 채널로 연락해주세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

