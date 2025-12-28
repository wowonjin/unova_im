import { redirect } from "next/navigation";

export default async function LecturesPage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string }>;
}) {
  const sp = await searchParams;
  const subject = sp?.subject ? `&subject=${encodeURIComponent(sp.subject)}` : "";
  // 표시 라벨은 "강의"로 통일
  redirect(`/store?type=${encodeURIComponent("강의")}${subject}`);
}


