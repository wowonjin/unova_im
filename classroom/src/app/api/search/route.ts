import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ ok: true, courses: [], textbooks: [] });
    }

    // 검색어를 포함하는 강좌와 교재 검색
    // NOTE:
    // - 교재(Textbook)에는 slug 필드가 없으므로 select 하면 런타임 에러가 납니다.
    // - 일부 환경(SQLite 등)에서는 contains + mode: insensitive가 제한될 수 있어 폴백을 둡니다.
    const qLower = q.toLowerCase();

    const courseWhereInsensitive = {
      isPublished: true,
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { teacherName: { contains: q, mode: "insensitive" as const } },
        { subjectName: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    };
    const textbookWhereInsensitive = {
      isPublished: true,
      OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }],
    };

    const courseSelect = {
      id: true,
      title: true,
      slug: true,
      teacherName: true,
      subjectName: true,
      description: true,
      thumbnailUrl: true,
      thumbnailStoredPath: true,
      price: true,
      rating: true,
    } as const;

    const textbookSelect = {
      id: true,
      title: true,
      teacherName: true,
      subjectName: true,
      description: true,
      thumbnailUrl: true,
      price: true,
    } as const;

    let courses: any[] = [];
    let textbooks: any[] = [];

    try {
      [courses, textbooks] = await Promise.all([
        prisma.course.findMany({ where: courseWhereInsensitive as any, select: courseSelect, orderBy: { createdAt: "desc" }, take: 8 }),
        prisma.textbook.findMany({ where: textbookWhereInsensitive as any, select: textbookSelect, orderBy: { createdAt: "desc" }, take: 5 }),
      ]);
    } catch {
      // 폴백: mode 없이 조회 후 앱 레벨에서 소문자 포함 검사
      const [cAll, tAll] = await Promise.all([
        prisma.course.findMany({
          where: { isPublished: true },
          select: courseSelect,
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
        prisma.textbook.findMany({
          where: { isPublished: true },
          select: textbookSelect,
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
      ]);

      const matchCourse = (x: any) =>
        [x?.title, x?.teacherName, x?.subjectName, x?.description]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .some((v) => String(v).toLowerCase().includes(qLower));
      const matchTextbook = (x: any) =>
        [x?.title, x?.teacherName, x?.subjectName, x?.description]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .some((v) => String(v).toLowerCase().includes(qLower));

      courses = cAll.filter(matchCourse).slice(0, 8);
      textbooks = tAll.filter(matchTextbook).slice(0, 5);
    }

    return NextResponse.json({ ok: true, courses, textbooks });
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json({ ok: false, error: "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
