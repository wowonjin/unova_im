import { redirect } from "next/navigation";

export default function EnterPage() {
  // 로그인 기능 제거: /enter는 /admin으로 바로 이동
  redirect("/admin");
}
