import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export type CurrentUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

const TEACHER_COOKIE = "unova_teacher_email";
function parseAdminEmailsEnv() {
  const raw = process.env.ADMIN_EMAILS || "";
  const emails = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

// 운영에서는 env로 제어(권장). 미설정 시 개발 편의용 기본 목록 fallback.
const DEFAULT_ALLOWED_TEACHERS = new Set(
  ["admin@gmail.com", "admin1@gmail.com", "admin2@gmail.com", "admin3@gmail.com", "admin4@gmail.com"].map((x) =>
    x.toLowerCase()
  )
);

function isAllowedTeacherEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  const fromEnv = parseAdminEmailsEnv();
  if (fromEnv.size) return fromEnv.has(normalized);
  return DEFAULT_ALLOWED_TEACHERS.has(normalized);
}

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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // 교사 쿠키가 있으면(관리 플랫폼에서 로그인한 상태) 그 교사를 현재 사용자로 취급
  const teacher = await getCurrentTeacherUser();
  if (teacher) return teacher;

  // 그 외에는 기본 사용자(데모/공개 강의실)
  return await getDefaultUser();
}

export async function getCurrentTeacherUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const email = jar.get(TEACHER_COOKIE)?.value?.toLowerCase().trim() ?? "";
  if (!email) return null;
  if (!isAllowedTeacherEmail(email)) return null;

  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, lastLoginAt: new Date() },
    select: { id: true, email: true },
  });

  return { id: user.id, email: user.email, isAdmin: true };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdminUser(): Promise<CurrentUser> {
  const user = await getCurrentTeacherUser();
  if (!user) redirect("/enter");
  return user;
}


