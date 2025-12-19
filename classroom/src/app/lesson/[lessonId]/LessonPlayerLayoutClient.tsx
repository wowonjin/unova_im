"use client";

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function LessonPlayerLayoutClient({ left, right }: Props) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        {left}
      </div>

      <div className="xl:sticky xl:top-24">{right}</div>
    </div>
  );
}


