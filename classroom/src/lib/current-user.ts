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

type TeacherAccount = {
  teacherId: string;
  teacherSlug: string;
  teacherName: string;
};

function allowDevAdminBypass(): boolean {
  // 기존 프로젝트는 "로그인 없이도 관리자 페이지가 열리는" 흐름을 사용해왔습니다.
  // 대규모(멀티 계정)로 갈수록 위험하므로, 운영에서는 반드시 세션 기반으로 막고
  // 개발 편의가 필요하면 아래 플래그로만 허용합니다.
  if (process.env.ALLOW_DEV_ADMIN_BYPASS === "1") return true;
  if (process.env.ALLOW_DEV_ADMIN_BYPASS === "0") return false;
  // 기본값: 개발 환경에서는 허용(기존 동작 유지), 운영에서는 차단
  return process.env.NODE_ENV !== "production";
}

async function getDefaultAdminUser(): Promise<CurrentUser> {
  // 관리자 페이지용 고정 관리자 계정
  const email = (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, name: "관리자", lastLoginAt: new Date() },
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
  // 관리자 이메일 확인 (ADMIN_EMAIL 또는 ADMIN_EMAILS 지원)
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  
  // 단일 관리자 이메일 또는 관리자 목록에 포함되어 있으면 관리자
  const userEmail = sessionUser.email.toLowerCase().trim();
  const isAdmin = userEmail === adminEmail || adminEmails.includes(userEmail);
  
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    profileImageUrl: sessionUser.profileImageUrl,
    isAdmin,
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
 * 관리자 페이지용
 * - 운영: 세션 기반 + ADMIN_EMAIL/ADMIN_EMAILS 체크(= isAdmin)
 * - 개발: 기존 흐름 호환을 위해 필요 시 bypass 허용
 */
export async function requireAdminUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (u?.isAdmin) return u;
  if (allowDevAdminBypass()) return await getDefaultAdminUser();
  throw new Error("UNAUTHORIZED");
}

/**
 * 교사(관리) 기능용
 * - 운영: 세션 유저(관리자/선생님 모두 가능)를 반환
 * - 개발: 필요 시 bypass 허용
 */
export async function getCurrentTeacherUser(): Promise<CurrentUser | null> {
  const u = await getCurrentUser();
  if (u) return u;
  if (allowDevAdminBypass()) return await getDefaultAdminUser();
  return null;
}

async function ensureTeacherAccountColumns() {
  // Teacher 테이블은 배포/로컬에서 마이그레이션 누락에 대비해 raw 컬럼 추가 패턴을 사용 중입니다.
  // 선생님 계정 연결용 컬럼도 동일 패턴으로 보강합니다.
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "accountUserId" TEXT;');
  } catch {
    // ignore
  }
}

export async function getTeacherAccountByUserId(userId: string): Promise<TeacherAccount | null> {
  const uid = (userId || "").trim();
  if (!uid) return null;
  await ensureTeacherAccountColumns();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      'SELECT "id", "slug", "name" FROM "Teacher" WHERE "accountUserId" = $1 LIMIT 1',
      uid
    )) as any[];
    const r = rows?.[0];
    if (!r) return null;
    return {
      teacherId: String(r.id),
      teacherSlug: String(r.slug),
      teacherName: String(r.name),
    };
  } catch {
    return null;
  }
}

export async function requireTeacherAccountUser(): Promise<{ user: CurrentUser; teacher: TeacherAccount }> {
  const user = await requireCurrentUser();
  // 관리자는 선생님 콘솔이 아니라 슈퍼어드민 콘솔(/admin)을 쓰는 게 기본이므로
  // 여기서는 "연결된 Teacher 계정이 있는 사용자"만 선생님 콘솔에 허용합니다.
  const teacher = await getTeacherAccountByUserId(user.id);
  if (!teacher) throw new Error("FORBIDDEN");
  return { user, teacher };
}
