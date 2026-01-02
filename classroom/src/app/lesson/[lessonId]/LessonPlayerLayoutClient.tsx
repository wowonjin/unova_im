"use client";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function LessonPlayerLayoutClient({ left, right }: Props) {
  return (
    <div className="mt-0 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">{left}</div>

      {/* 우측 패널은 스크롤 내내 자연스럽게 따라다니도록(viewport 기준) sticky + 고정 높이로 처리 */}
      <div className="lg:sticky lg:top-6 lg:self-start lg:h-[calc(100vh-3rem)]">
        {right}
      </div>
    </div>
  );
}
