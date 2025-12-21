import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

async function getDefaultUser(): Promise<CurrentUser> {
  const email = (process.env.DEFAULT_USER_EMAIL || "admin@example.com").toLowerCase().trim();
  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, lastLoginAt: new Date() },
    select: { id: true, email: true },
  });
  return { id: user.id, email: user.email, isAdmin: false };
}

async function getDefaultAdminUser(): Promise<CurrentUser> {
  // 로그인 기능 제거: 별도 인증 없이 관리 기능을 사용할 수 있도록 "고정 관리자"를 사용
  const email = (process.env.DEFAULT_ADMIN_EMAIL || "admin@local").toLowerCase().trim();
  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, lastLoginAt: new Date() },
    select: { id: true, email: true },
  });
  return { id: user.id, email: user.email, isAdmin: true };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // 그 외에는 기본 사용자(데모/공개 강의실)
  return await getDefaultUser();
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdminUser(): Promise<CurrentUser> {
  // 로그인 기능 제거: 관리자 페이지는 인증 없이 접근 가능
  return await getDefaultAdminUser();
}

export async function getCurrentTeacherUser(): Promise<CurrentUser | null> {
  // 로그인 기능 제거: 교사(관리) 기능도 별도 인증 없이 "고정 관리자"를 사용
  // NOTE: 관리자 화면(`requireAdminUser`)과 동일한 사용자로 맞춰야
  //       ownerId 기반 쿼리/권한 체크가 일관됩니다.
  return await getDefaultAdminUser();
}


