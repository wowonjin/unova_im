import { redirect } from "next/navigation";

export default async function BooksPage({
  searchParams,
}: {
  searchParams?: Promise<{ subject?: string }>;
}) {
  const sp = await searchParams;
  const subject = sp?.subject ? `&subject=${encodeURIComponent(sp.subject)}` : "";
  redirect(`/store?type=${encodeURIComponent("교재")}${subject}`);
}


