import { prisma } from "@/lib/prisma";
import { getSessionUser, SessionUser } from "@/lib/session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
};

async function getDefaultAdminUser(): Promise<CurrentUser> {
  // 관리자 페이지용 고정 관리자 계정
  const email = (process.env.DEFAULT_ADMIN_EMAIL || "admin@local").toLowerCase().trim();
  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, lastLoginAt: new Date() },
    select: { id: true, email: true, name: true, profileImageUrl: true },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profileImageUrl: user.profileImageUrl,
    isAdmin: true,
    isLoggedIn: true,
  };
}

function sessionUserToCurrentUser(sessionUser: SessionUser): CurrentUser {
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    profileImageUrl: sessionUser.profileImageUrl,
    isAdmin: false,
    isLoggedIn: true,
  };
}

/**
 * 현재 로그인한 사용자 가져오기
 * - 세션이 있으면: 세션 사용자 반환
 * - 세션이 없으면: null 반환 (로그인 필요)
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    return sessionUserToCurrentUser(sessionUser);
  }
  return null;
}

/**
 * 현재 사용자 또는 게스트 정보 가져오기
 * - 세션이 있으면: 세션 사용자 반환
 * - 세션이 없으면: 게스트 정보 반환 (로그인하지 않은 상태)
 */
export async function getCurrentUserOrGuest(): Promise<CurrentUser> {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    return sessionUserToCurrentUser(sessionUser);
  }
  // 게스트 (로그인하지 않은 상태)
  return {
    id: "",
    email: "",
    name: null,
    profileImageUrl: null,
    isAdmin: false,
    isLoggedIn: false,
  };
}

/**
 * 로그인 필수 - 로그인하지 않으면 에러
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * 관리자 페이지용 - 항상 고정 관리자 반환
 */
export async function requireAdminUser(): Promise<CurrentUser> {
  return await getDefaultAdminUser();
}

/**
 * 교사(관리) 기능용 - 항상 고정 관리자 반환
 */
export async function getCurrentTeacherUser(): Promise<CurrentUser | null> {
  return await getDefaultAdminUser();
}
