import prismaPkg from "@prisma/client";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = prismaPkg;

// Load `.env.local` / `.env` for local dev runs (seed is executed via plain `node`).
(() => {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) return;
  try {
    const dotenv = require("dotenv");
    if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  } catch {
    // ignore
  }
})();

function shouldUsePgSsl(dbUrl) {
  if (process.env.PGSSLMODE === "require") return true;
  try {
    const u = new URL(dbUrl);
    const sslmode = String(u.searchParams.get("sslmode") || "").toLowerCase();
    const ssl = String(u.searchParams.get("ssl") || "").toLowerCase();
    if (sslmode === "require") return true;
    if (ssl === "true" || ssl === "1") return true;
    if (String(u.hostname || "").endsWith(".render.com")) return true;
  } catch {
    // ignore
  }
  return false;
}

function createPrisma() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  const isPostgres = dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));

  if (isPostgres) {
    const { Pool } = require("pg");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: shouldUsePgSsl(dbUrl) ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Local fallback: SQLite (dev.db by default)
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

  let dbPath = process.env.DATABASE_PATH || "dev.db";
  let sqliteUrl;
  if (dbUrl && dbUrl.startsWith("file:")) {
    sqliteUrl = dbUrl;
  } else {
    sqliteUrl = `file:${dbPath}`;
  }

  const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

function truthyEnv(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y" || s === "on";
}

function extractTeachersFromTeachersDataFile(fileText) {
  // teachersData:  "slug": { ... name: "이름", ... }
  // name이 첫 필드가 아닐 수 있어서, 블록 초반(대략 500자)에서 name을 찾는다.
  const re = /"([^"]+)"\s*:\s*\{[\s\S]{0,500}?name\s*:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(fileText))) {
    const slug = m[1];
    const name = m[2];
    if (typeof slug === "string" && slug.length && typeof name === "string" && name.length) {
      out.push({ slug, name });
    }
  }
  // slug unique
  const map = new Map();
  for (const t of out) map.set(t.slug, t);
  return Array.from(map.values());
}

async function seedTeacherTestData() {
  const enabled = truthyEnv(process.env.SEED_TEACHER_TEST_DATA);
  if (!enabled) return { enabled: false, teachers: 0 };

  const teachersFile = path.join(process.cwd(), "src", "app", "teachers", "[teacherId]", "page.tsx");
  if (!fs.existsSync(teachersFile)) {
    console.warn("[seed] SEED_TEACHER_TEST_DATA enabled but teachersData file not found:", teachersFile);
    return { enabled: true, teachers: 0 };
  }

  const text = fs.readFileSync(teachersFile, "utf-8");
  const teachers = extractTeachersFromTeachersDataFile(text);

  for (const t of teachers) {
    const teacherEmail = `seed-teacher+${t.slug}@unova.local`;
    const teacherUser = await prisma.user.upsert({
      where: { email: teacherEmail },
      update: { name: t.name },
      create: { email: teacherEmail, name: t.name, createdAt: new Date() },
    });

    // === 공지사항(선생님별 카테고리) ===
    const teacherNoticeCategory = `선생님 공지사항 - ${t.name}`;
    for (let i = 1; i <= 3; i++) {
      const slug = `seed-${t.slug}-notice-${i}`;
      await prisma.notice.upsert({
        where: { slug },
        update: {
          authorId: teacherUser.id,
          isPublished: true,
          category: teacherNoticeCategory,
          title: `${t.name} 선생님 공지 ${i}`,
          body: `<p>${t.name} 선생님 공지 테스트 내용 ${i} 입니다.</p>`,
        },
        create: {
          authorId: teacherUser.id,
          slug,
          isPublished: true,
          category: teacherNoticeCategory,
          title: `${t.name} 선생님 공지 ${i}`,
          body: `<p>${t.name} 선생님 공지 테스트 내용 ${i} 입니다.</p>`,
        },
      });
    }

    // === 강의(Course) 1개 + 리뷰 ===
    const courseSlug = `seed-${t.slug}-course`;
    const existingCourse = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { id: true, position: true },
    });
    const maxCoursePos = await prisma.course.findFirst({
      where: { ownerId: teacherUser.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const coursePosition = existingCourse?.position ?? ((maxCoursePos?.position ?? 0) + 1);

    const course = existingCourse
      ? await prisma.course.update({
          where: { slug: courseSlug },
          data: {
            title: `${t.name}T 강의`,
            description: `선생님 페이지 리뷰/평점 연동 테스트용 강의`,
            isPublished: true,
            ownerId: teacherUser.id,
            teacherName: t.name,
            position: coursePosition,
          },
        })
      : await prisma.course.create({
          data: {
            ownerId: teacherUser.id,
            title: `${t.name}T 강의`,
            slug: courseSlug,
            description: `선생님 페이지 리뷰/평점 연동 테스트용 강의`,
            thumbnailUrl: null,
            isPublished: true,
            imwebGroupCode: null,
            teacherName: t.name,
            subjectName: null,
            position: coursePosition,
          },
        });

    // 기존 시드 리뷰 제거(재실행 시 덮어쓰기)
    await prisma.review.deleteMany({
      where: {
        productType: "COURSE",
        courseId: course.id,
        OR: [
          { authorName: { startsWith: "테스터" } },
          { content: { contains: "강의 리뷰 테스트" } },
        ],
      },
    });
    const courseRatings = [5, 4, 5, 3, 4];
    for (let i = 0; i < courseRatings.length; i++) {
      const rating = courseRatings[i];
      await prisma.review.create({
        data: {
          productType: "COURSE",
          courseId: course.id,
          textbookId: null,
          userId: null,
          authorName: `테스터${i + 1}`,
          rating,
          content: `(${rating}점) ${t.name}T 강의 리뷰 테스트 ${i + 1}`,
          isApproved: true,
        },
      });
    }

    const courseCount = await prisma.review.count({ where: { productType: "COURSE", courseId: course.id, isApproved: true } });
    const courseAvg = await prisma.review.aggregate({
      where: { productType: "COURSE", courseId: course.id, isApproved: true },
      _avg: { rating: true },
    });
    await prisma.course.update({
      where: { id: course.id },
      data: { reviewCount: courseCount, rating: courseAvg._avg.rating || 0 },
    });

    // === 교재(Textbook) 1개 + 리뷰 ===
    const tbStoredPath = `seed/textbooks/${t.slug}.pdf`;
    const existingTb = await prisma.textbook.findFirst({
      where: { ownerId: teacherUser.id, storedPath: tbStoredPath },
      select: { id: true, position: true },
    });
    const maxTbPos = await prisma.textbook.findFirst({
      where: { ownerId: teacherUser.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const tbPosition = existingTb?.position ?? ((maxTbPos?.position ?? 0) + 1);

    const tb = existingTb
      ? await prisma.textbook.update({
          where: { id: existingTb.id },
          data: {
            title: `${t.name}T 교재`,
            ownerId: teacherUser.id,
            teacherName: t.name,
            isPublished: true,
            position: tbPosition,
            originalName: `${t.slug}.pdf`,
            mimeType: "application/pdf",
            sizeBytes: 0,
          },
        })
      : await prisma.textbook.create({
          data: {
            ownerId: teacherUser.id,
            position: tbPosition,
            title: `${t.name}T 교재`,
            teacherName: t.name,
            subjectName: null,
            storedPath: tbStoredPath,
            originalName: `${t.slug}.pdf`,
            mimeType: "application/pdf",
            sizeBytes: 0,
            isPublished: true,
            imwebProdCode: null,
            thumbnailUrl: null,
            entitlementDays: 365,
          },
        });

    // 기존 시드 리뷰 제거(재실행 시 덮어쓰기)
    await prisma.review.deleteMany({
      where: {
        productType: "TEXTBOOK",
        textbookId: tb.id,
        OR: [
          { authorName: { startsWith: "테스터TB" } },
          { content: { contains: "교재 리뷰 테스트" } },
        ],
      },
    });
    const tbRatings = [5, 5, 4];
    for (let i = 0; i < tbRatings.length; i++) {
      const rating = tbRatings[i];
      await prisma.review.create({
        data: {
          productType: "TEXTBOOK",
          courseId: null,
          textbookId: tb.id,
          userId: null,
          authorName: `테스터TB${i + 1}`,
          rating,
          content: `(${rating}점) ${t.name}T 교재 리뷰 테스트 ${i + 1}`,
          isApproved: true,
        },
      });
    }

    const tbCount = await prisma.review.count({ where: { productType: "TEXTBOOK", textbookId: tb.id, isApproved: true } });
    const tbAvg = await prisma.review.aggregate({
      where: { productType: "TEXTBOOK", textbookId: tb.id, isApproved: true },
      _avg: { rating: true },
    });
    await prisma.textbook.update({
      where: { id: tb.id },
      data: { reviewCount: tbCount, rating: tbAvg._avg.rating || 0 },
    });
  }

  return { enabled: true, teachers: teachers.length };
}

async function main() {
  const seedEmail =
    (process.env.DEFAULT_USER_EMAIL || process.env.ADMIN_SEED_EMAIL || "admin@gmail.com").toLowerCase().trim();

  const user = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {},
    create: { email: seedEmail, createdAt: new Date() },
  });

  const sampleCourses = [
    {
      slug: "sample-course",
      title: "[2027] 백하욱T 커넥트 수학 강의",
      description: "MVP 확인용 샘플 강좌입니다.",
      lessons: [
        {
          title: "1강. 오리엔테이션",
          vimeoVideoId: "76979871",
          durationSeconds: 930,
          description:
            "이 강의는 수강을 시작하기 전에 강좌 전체 구조와 학습 방법을 안내하는 OT(오리엔테이션)입니다.\n\n- 자료 다운로드/활용 팁\n- 질문하기(Q&A) 이용 안내",
          goals: ["강좌 구성(커리큘럼) 이해", "학습 루틴(예습→강의→복습) 설정", "자료/질문하기 사용법 익히기"],
          outline: ["강좌 소개 및 목표", "차시별 학습 가이드", "자료 다운로드/활용 팁", "질문하기(Q&A) 이용 안내"],
        },
        { title: "2강. 예시 강의", vimeoVideoId: "22439234", durationSeconds: 1245 },
      ],
    },
    {
      slug: "sample-course-physics",
      title: "[2027] 김철수T 커넥트 물리 강의",
      description: "데모용 강좌(물리)입니다.",
      lessons: [
        { title: "1강. OT", vimeoVideoId: "146022717", durationSeconds: 980 },
        { title: "2강. 역학", vimeoVideoId: "395212534", durationSeconds: 1420 },
        { title: "3강. 운동량", vimeoVideoId: "357274789", durationSeconds: 1110 },
        { title: "4강. 에너지", vimeoVideoId: "1084537", durationSeconds: 1560 },
      ],
    },
    {
      slug: "sample-course-english",
      title: "[2027] 이영희T 커넥트 영어 강의",
      description: "데모용 강좌(영어)입니다.",
      lessons: [
        { title: "1강. OT", vimeoVideoId: "76979871", durationSeconds: 900 },
        { title: "2강. 문장 구조", vimeoVideoId: "22439234", durationSeconds: 1800 },
        { title: "3강. 독해 전략", vimeoVideoId: "146022717", durationSeconds: 1500 },
      ],
    },
  ];

  const courses = [];
  // NOTE: Course has @@unique([ownerId, position]) so seeded sample courses must have unique positions per owner.
  for (let idx = 0; idx < sampleCourses.length; idx++) {
    const c = sampleCourses[idx];
    const seededCoursePosition = 9000 + idx;
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        description: c.description,
        isPublished: true,
        ownerId: user.id,
        position: seededCoursePosition,
      },
      create: {
        ownerId: user.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: null,
        isPublished: true,
        imwebGroupCode: null,
        position: seededCoursePosition,
        lessons: {
          create: c.lessons.map((l, idx) => ({
            title: l.title,
            position: idx + 1,
            vimeoVideoId: l.vimeoVideoId,
            durationSeconds: l.durationSeconds,
            description: l.description ?? null,
            goals: l.goals ?? null,
            outline: l.outline ?? null,
          })),
        },
      },
      include: { lessons: true },
    });
    // Re-running seed should update existing lessons too (not just first-time create)
    for (let idx = 0; idx < c.lessons.length; idx++) {
      const l = c.lessons[idx];
      await prisma.lesson.upsert({
        where: { courseId_position: { courseId: course.id, position: idx + 1 } },
        update: {
          title: l.title,
          vimeoVideoId: l.vimeoVideoId,
          durationSeconds: l.durationSeconds,
          isPublished: true,
          description: l.description ?? null,
          goals: l.goals ?? null,
          outline: l.outline ?? null,
        },
        create: {
          courseId: course.id,
          title: l.title,
          position: idx + 1,
          vimeoVideoId: l.vimeoVideoId,
          durationSeconds: l.durationSeconds,
          isPublished: true,
          description: l.description ?? null,
          goals: l.goals ?? null,
          outline: l.outline ?? null,
        },
      });
    }
    courses.push(course);
  }

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + 365 * 24 * 60 * 60 * 1000);

  for (const c of courses) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: c.id } },
      update: { status: "ACTIVE", startAt, endAt },
      create: { userId: user.id, courseId: c.id, status: "ACTIVE", startAt, endAt },
    });
  }

  const now = Date.now();
  for (const c of courses) {
    const l1 = c.lessons[0];
    const l2 = c.lessons[1] ?? null;
    if (l1) {
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: l1.id } },
        update: { lastSeconds: 620, percent: 35 },
        create: { userId: user.id, lessonId: l1.id, lastSeconds: 620, percent: 35 },
      });
    }
    if (l2) {
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: l2.id } },
        update: { lastSeconds: 1420, percent: 78, completedAt: new Date(now - 1000 * 60 * 60 * 24) },
        create: {
          userId: user.id,
          lessonId: l2.id,
          lastSeconds: 1420,
          percent: 78,
          completedAt: new Date(now - 1000 * 60 * 60 * 24),
        },
      });
    }
  }

  const teacherTest = await seedTeacherTestData();

  console.log("Seed complete.");
  console.log(`- Seed email: ${seedEmail}`);
  console.log(`- Sample courses: ${courses.map((c) => c.slug).join(", ")}`);
  console.log(`- Teacher test data: ${teacherTest.enabled ? `enabled (${teacherTest.teachers} teachers)` : "disabled"}`);
  console.log("Tip: ADMIN_EMAILS 환경변수에 admin 이메일을 넣으면 관리자 메뉴가 열립니다.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


