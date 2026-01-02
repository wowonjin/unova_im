import { redirect } from "next/navigation";

export default async function NoticeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    // ignore
  }
  slug = slug.normalize("NFC");
  redirect(`/notices?slug=${encodeURIComponent(slug)}`);
}
