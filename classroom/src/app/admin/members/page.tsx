import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import MembersClient from "./MembersClient";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminUser();
  const sp = (await searchParams) ?? {};
  const query = sp.q?.trim() || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const limit = 50;
  const skip = (page - 1) * limit;

  // 검색 조건
  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [members, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImageUrl: true,
        imwebMemberCode: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            enrollments: true,
            textbookEntitlements: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const membersData = members.map((m) => ({
    id: m.id,
    email: m.email,
    name: m.name,
    phone: m.phone,
    profileImageUrl: m.profileImageUrl,
    imwebMemberCode: m.imwebMemberCode,
    createdAt: m.createdAt.toISOString(),
    lastLoginAt: m.lastLoginAt?.toISOString() || null,
    enrollmentCount: m._count.enrollments,
    textbookCount: m._count.textbookEntitlements,
  }));

  return (
    <AppShell>
      <MembersClient
        members={membersData}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
        query={query}
      />
    </AppShell>
  );
}

