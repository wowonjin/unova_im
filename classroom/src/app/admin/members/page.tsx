import AppShell from "@/app/_components/AppShell";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import MembersClient from "./MembersClient";
import { decryptPassword } from "@/lib/password-vault";

type MemberRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  imwebMemberCode: string | null;
  address: string | null;
  addressDetail: string | null;
  loginType: "kakao" | "naver" | "email" | "none" | "unknown";
  hasEmailPassword: boolean;
  adminPassword: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  enrollmentCount: number;
  textbookCount: number;
  totalPayment: number;
};

// 더미 회원 데이터
const dummyMembers: MemberRow[] = [
  {
    id: "member-1",
    email: "admin@gmail.com",
    name: "관리자",
    phone: "010-1234-5678",
    profileImageUrl: null,
    imwebMemberCode: null,
    address: "서울특별시 강남구 학동로 24길 20",
    addressDetail: "참존빌딩 402호",
    loginType: "email",
    hasEmailPassword: true,
    adminPassword: "admin",
    createdAt: "2024-01-01T00:00:00.000Z",
    lastLoginAt: "2025-12-25T10:00:00.000Z",
    enrollmentCount: 3,
    textbookCount: 2,
    totalPayment: 150000,
  },
  {
    id: "member-2",
    email: "kim.minsoo@example.com",
    name: "김민수",
    phone: "010-2345-6789",
    profileImageUrl: null,
    imwebMemberCode: "IMW001",
    address: "서울특별시 서초구 서초동 123-45",
    addressDetail: "아파트 101동 1001호",
    loginType: "kakao",
    hasEmailPassword: false,
    adminPassword: null,
    createdAt: "2024-06-15T09:30:00.000Z",
    lastLoginAt: "2025-12-24T14:20:00.000Z",
    enrollmentCount: 2,
    textbookCount: 1,
    totalPayment: 89000,
  },
  {
    id: "member-3",
    email: "lee.jiyoung@example.com",
    name: "이지영",
    phone: "010-3456-7890",
    profileImageUrl: null,
    imwebMemberCode: "IMW002",
    address: "경기도 성남시 분당구 정자동 567",
    addressDetail: null,
    loginType: "naver",
    hasEmailPassword: false,
    adminPassword: null,
    createdAt: "2024-08-20T11:00:00.000Z",
    lastLoginAt: "2025-12-23T09:15:00.000Z",
    enrollmentCount: 4,
    textbookCount: 3,
    totalPayment: 245000,
  },
  {
    id: "member-4",
    email: "park.soyeon@example.com",
    name: "박소연",
    phone: "010-4567-8901",
    profileImageUrl: null,
    imwebMemberCode: "IMW003",
    address: "인천광역시 연수구 송도동 89",
    addressDetail: "오피스텔 502호",
    loginType: "email",
    hasEmailPassword: true,
    adminPassword: null,
    createdAt: "2024-09-10T14:45:00.000Z",
    lastLoginAt: "2025-12-22T16:30:00.000Z",
    enrollmentCount: 1,
    textbookCount: 1,
    totalPayment: 0,
  },
  {
    id: "member-5",
    email: "choi.junhyuk@example.com",
    name: "최준혁",
    phone: "010-5678-9012",
    profileImageUrl: null,
    imwebMemberCode: "IMW004",
    address: "대전광역시 유성구 봉명동 234",
    addressDetail: null,
    loginType: "email",
    hasEmailPassword: true,
    adminPassword: null,
    createdAt: "2024-10-05T08:20:00.000Z",
    lastLoginAt: "2025-12-21T11:45:00.000Z",
    enrollmentCount: 3,
    textbookCount: 2,
    totalPayment: 178000,
  },
];

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
  await requireAdminUser();
  const sp = (await searchParams) ?? {};
  const query = sp.q?.trim() || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 50;
  const parsedLimit = parseInt(sp.limit || "", 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(MAX_LIMIT, Math.max(5, parsedLimit))
      : DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  let membersData: MemberRow[] = dummyMembers;
  let totalCount = dummyMembers.length;
  let totalPages = 1;
  let loginStats: { kakao: number; naver: number; email: number } | null = null;

  try {
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

    type MemberQueryRow = {
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      profileImageUrl: string | null;
      imwebMemberCode: string | null;
      address: string | null;
      addressDetail: string | null;
      birthday: string | null;
      createdAt: Date;
      lastLoginAt: Date | null;
      oauthAccounts?: Array<{ provider: string | null }>;
      emailCredential?: { passwordHash: string | null; passwordCiphertext?: string | null } | null;
      _count: { enrollments: number; textbookEntitlements: number };
    };

    let members: MemberQueryRow[];
    let count: number;
    let stats: { kakao: number; naver: number; email: number };

    // Prisma Client가 아직 갱신되지 않은 상태(Dev/Turbopack 캐시)에서는
    // `passwordCiphertext`가 unknown field로 터질 수 있어 fallback을 둔다.
    try {
      [members, count, stats] = await Promise.all([
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
            address: true,
            addressDetail: true,
            birthday: true,
            createdAt: true,
            lastLoginAt: true,
            oauthAccounts: { select: { provider: true } },
            emailCredential: { select: { passwordHash: true, passwordCiphertext: true } },
            _count: {
              select: {
                enrollments: true,
                textbookEntitlements: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
        Promise.all([
          prisma.user.count({ where: { ...where, oauthAccounts: { some: { provider: "kakao" } } } }),
          prisma.user.count({
            where: {
              ...where,
              oauthAccounts: { some: { provider: "naver" } },
              NOT: { oauthAccounts: { some: { provider: "kakao" } } },
            },
          }),
          prisma.user.count({
            where: {
              ...where,
              emailCredential: { isNot: null },
              oauthAccounts: { none: {} },
            },
          }),
        ]).then(([kakao, naver, email]) => ({ kakao, naver, email })),
      ]);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("Unknown field `passwordCiphertext`") || msg.includes("Unknown field \"passwordCiphertext\"")) {
        [members, count, stats] = await Promise.all([
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
              address: true,
              addressDetail: true,
              birthday: true,
              createdAt: true,
              lastLoginAt: true,
              oauthAccounts: { select: { provider: true } },
              emailCredential: { select: { passwordHash: true } },
              _count: {
                select: {
                  enrollments: true,
                  textbookEntitlements: true,
                },
              },
            },
          }),
          prisma.user.count({ where }),
          Promise.all([
            prisma.user.count({ where: { ...where, oauthAccounts: { some: { provider: "kakao" } } } }),
            prisma.user.count({
              where: {
                ...where,
                oauthAccounts: { some: { provider: "naver" } },
                NOT: { oauthAccounts: { some: { provider: "kakao" } } },
              },
            }),
            prisma.user.count({
              where: {
                ...where,
                emailCredential: { isNot: null },
                oauthAccounts: { none: {} },
              },
            }),
          ]).then(([kakao, naver, email]) => ({ kakao, naver, email })),
        ]);
      } else {
        throw e;
      }
    }

    totalCount = count;
    totalPages = Math.ceil(totalCount / limit);
    loginStats = stats;

    membersData = members.map((m) => {
      const providers = (m.oauthAccounts ?? []).map((a) => (a.provider || "").toLowerCase());
      const hasEmailPassword = Boolean(m.emailCredential?.passwordHash);
      let adminPassword: string | null = null;
      if (m.emailCredential?.passwordCiphertext) {
        try {
          adminPassword = decryptPassword(m.emailCredential.passwordCiphertext);
        } catch {
          adminPassword = null;
        }
      }
      const loginType: MemberRow["loginType"] =
        providers.includes("kakao") ? "kakao" :
        providers.includes("naver") ? "naver" :
        providers.length > 0 ? "unknown" :
        (hasEmailPassword ? "email" : "none");

      return {
      id: m.id,
      email: m.email,
      name: m.name ?? null,
      phone: m.phone ?? null,
      profileImageUrl: m.profileImageUrl ?? null,
      imwebMemberCode: m.imwebMemberCode ?? null,
      address: m.address ?? null,
      addressDetail: m.addressDetail ?? null,
      loginType,
      hasEmailPassword,
      adminPassword,
      createdAt: m.createdAt.toISOString(),
      lastLoginAt: m.lastLoginAt?.toISOString() || null,
      enrollmentCount: m._count.enrollments,
      textbookCount: m._count.textbookEntitlements,
      totalPayment: 0, // TODO: 실제 결제 금액 연동 필요
      };
    });
  } catch (error) {
    // DB 연결 실패 시 더미 데이터 사용
    console.error("DB connection error, using dummy data:", error);
    
    // 검색 필터 적용
    if (query) {
      const q = query.toLowerCase();
      membersData = dummyMembers.filter(
        (m) =>
          m.email.toLowerCase().includes(q) ||
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.phone && m.phone.includes(q))
      );
      totalCount = membersData.length;
    }

    // 더미 데이터 기준 통계
    const subset = membersData;
    const kakao = subset.filter((m) => m.loginType === "kakao").length;
    const naver = subset.filter((m) => m.loginType === "naver").length;
    const email = subset.filter((m) => m.loginType === "email").length;
    loginStats = { kakao, naver, email };
  }

  return (
    <AppShell>
      <MembersClient
        members={membersData}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        pageSize={limit}
        loginStats={loginStats ?? undefined}
      />
    </AppShell>
  );
}

