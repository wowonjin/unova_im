import Link from "next/link";
import { redirect } from "next/navigation";
import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import AdminNoticeEditorClient from "../AdminNoticeEditorClient";

function displayBoardName(category: string): string {
  const c = (category || "").trim();
  const prefix = "선생님 공지사항 -";
  if (c.startsWith(prefix)) {
    const name = c.slice(prefix.length).trim();
    if (name) return `${name}T 게시판`;
  }
  return c || "공지사항";
}

export default async function NoticeNewPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/notices");

  const [categoriesRaw, teachersRaw] = await Promise.all([
    prisma.notice.groupBy({
      by: ["category"],
      where: { isPublished: true },
      _count: { _all: true },
    }),
    prisma.teacher.findMany({
      where: { isActive: true },
      select: { name: true, position: true, createdAt: true },
    }),
  ]);

  const countByCategory = new Map<string, number>();
  for (const r of categoriesRaw) {
    const key = (r.category || "").trim();
    if (!key) continue;
    countByCategory.set(key, r._count?._all ?? 0);
  }

  const sortedTeachers = teachersRaw
    .slice()
    .sort((a, b) => {
      const ap = a.position === 0 ? Number.MAX_SAFE_INTEGER : a.position;
      const bp = b.position === 0 ? Number.MAX_SAFE_INTEGER : b.position;
      if (ap !== bp) return ap - bp;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const teacherPrefix = "선생님 공지사항 -";
  const teacherCategoriesFromTeachers = sortedTeachers.map((t) => {
    const category = `${teacherPrefix} ${t.name}`.replace(/\s+/g, " ").trim();
    const count = countByCategory.get(category) ?? 0;
    return { category, count };
  });

  const teacherCategorySet = new Set(teacherCategoriesFromTeachers.map((x) => x.category));
  const legacyTeacherCategories = Array.from(countByCategory.entries())
    .filter(([cat]) => cat.startsWith(teacherPrefix) && !teacherCategorySet.has(cat))
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category, "ko"));

  const normalCategories = Array.from(countByCategory.entries())
    .filter(([cat]) => !cat.startsWith(teacherPrefix))
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  const categories = [...teacherCategoriesFromTeachers, ...legacyTeacherCategories, ...normalCategories];

  const categorySuggestions = Array.from(
    new Set(categories.map((c) => c.category).filter((x): x is string => typeof x === "string" && x.trim().length > 0)),
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const defaultCategory = user?.name ? `선생님 공지사항 - ${user.name}` : "선생님 공지사항";

  const selected = typeof sp?.cat === "string" ? sp.cat.trim() : "";
  const selectedCategory = selected && categories.some((c) => c.category === selected) ? selected : "";

  const returnTo = selectedCategory ? `/notices?cat=${encodeURIComponent(selectedCategory)}` : "/notices";
  const pageTitle = selectedCategory ? `${displayBoardName(selectedCategory)} 글 작성` : "공지사항 글 작성";

  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 pt-[70px]">
        <section className="py-8 md:py-10">
          {/* 실제 게시판 본문(데스크톱 오른쪽 컬럼) 폭과 비슷하게: max-w-4xl */}
          <div className="mx-auto w-full max-w-4xl px-4">
            <div>
              <AdminNoticeEditorClient
                defaultCategory={defaultCategory}
                categorySuggestions={categorySuggestions}
                selectedCategory={selectedCategory || undefined}
                returnTo={returnTo}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

