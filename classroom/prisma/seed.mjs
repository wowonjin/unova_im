import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();
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
  for (const c of sampleCourses) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, description: c.description, isPublished: true, ownerId: user.id },
      create: {
        ownerId: user.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: null,
        isPublished: true,
        imwebGroupCode: null,
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

  console.log("Seed complete.");
  console.log(`- Seed email: ${seedEmail}`);
  console.log(`- Sample courses: ${courses.map((c) => c.slug).join(", ")}`);
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


