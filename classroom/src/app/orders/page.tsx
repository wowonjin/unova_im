import { redirect } from "next/navigation";

// 기존 주문내역 페이지는 마이페이지의 주문내역 탭으로 통합되었습니다
export default function OrdersPage() {
  redirect("/mypage/orders");
}
