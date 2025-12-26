import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 관리자 권한 확인
    await requireAdminUser();
    
    const body = await req.json();
    const { courseId, lessonIds } = body as { courseId: string; lessonIds: string[] };

    if (!courseId || !lessonIds || !Array.isArray(lessonIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // 중복 ID 방지 (중복이면 position 충돌/유실 위험)
    const uniqueIds = new Set(lessonIds);
    if (uniqueIds.size !== lessonIds.length) {
      return NextResponse.json({ error: "Duplicated lessonIds" }, { status: 400 });
    }

    // 코스 존재 확인 (관리자는 모든 코스 수정 가능)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // 코스의 전체 강의 목록을 기준으로 정합성 검증 및 누락 강의 처리
    const existingLessons = await prisma.lesson.findMany({
      where: { courseId },
      select: { id: true, position: true },
      orderBy: { position: "asc" },
    });

    const existingIdSet = new Set(existingLessons.map((l) => l.id));
    const missingFromDb = lessonIds.filter((id) => !existingIdSet.has(id));
    if (missingFromDb.length > 0) {
      return NextResponse.json(
        { error: "Some lessons do not belong to the course", lessonIds: missingFromDb },
        { status: 400 }
      );
    }

    const providedIdSet = uniqueIds;
    const missingIds = existingLessons
      .map((l) => l.id)
      .filter((id) => !providedIdSet.has(id));

    // 최종 순서: 전달된 순서 + (혹시 누락된 강의는 기존 position 순서대로 뒤에 붙임)
    const finalOrder = [...lessonIds, ...missingIds];

    const maxPosition =
      existingLessons.reduce((acc, l) => Math.max(acc, l.position ?? 0), 0) || 0;
    // (courseId, position) 유니크 충돌을 피하기 위한 임시 오프셋
    const offset = maxPosition + finalOrder.length + 10;

    // Update positions in two phases to avoid UNIQUE(courseId, position) collisions
    await prisma.$transaction(async (tx) => {
      // 1) 임시로 모두 큰 값으로 밀어내서 1..N 범위를 비움
      await tx.lesson.updateMany({
        where: { courseId },
        data: { position: { increment: offset } },
      });

      // 2) 최종 position 적용 (각 position은 서로 다르고, 현재도 1..N이 비어있음)
      await Promise.all(
        finalOrder.map((lessonId, index) =>
          tx.lesson.update({
            where: { id: lessonId },
            data: { position: index + 1 },
          })
        )
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reorder lessons:", error);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}

