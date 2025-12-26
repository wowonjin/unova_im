"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/app/_components/ui";

export default function CreateCourseFormClient() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setPending(true);
        try {
          const formEl = e.currentTarget;
          const fd = new FormData(formEl);

          const res = await fetch("/api/admin/courses/create", {
            method: "POST",
            body: fd,
            headers: {
              "x-unova-client": "1",
              accept: "application/json",
            },
          });

          const payload = await res.json().catch(() => null);
          if (res.ok && payload?.ok) {
            formEl.reset();
            router.refresh();
            setSuccess("강좌가 생성되었습니다. 내 강좌 목록에 추가되었습니다.");
            return;
          }

          setError("강좌 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } catch {
          setError("강좌 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Field label="강좌 제목">
        <Input
          name="title"
          required
          placeholder="예: [2027] 김OO T 커넥트 수학"
          className="bg-transparent"
          disabled={pending}
        />
      </Field>

      <Field label="선생님">
        <Input name="teacherName" placeholder="예: 김OO" className="bg-transparent" disabled={pending} />
      </Field>

      <Field label="과목">
        <Input name="subjectName" placeholder="예: 수학" className="bg-transparent" disabled={pending} />
      </Field>

      <Field label="공개 상태">
        <select
          name="isPublished"
          defaultValue="1"
          disabled={pending}
          className="h-10 w-full rounded-xl border border-white/10 bg-[#131315] px-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 disabled:opacity-50"
        >
          <option value="1">공개</option>
          <option value="0">비공개</option>
        </select>
      </Field>

      <Field label="수강 기간(일)">
        <Input
          name="enrollmentDays"
          type="number"
          min={1}
          max={3650}
          defaultValue={365}
          className="bg-transparent"
          disabled={pending}
        />
      </Field>

      <Field label="썸네일(선택)">
        <input
          className="block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border file:border-white/10 file:bg-transparent file:px-3 file:py-2 file:text-sm file:text-white/80 hover:file:bg-transparent disabled:opacity-50"
          type="file"
          name="thumbnail"
          accept="image/*"
          disabled={pending}
        />
      </Field>

      <div className="flex items-end">
        <Button type="submit" variant="ghostSolid" disabled={pending}>
          {pending ? "생성 중..." : "강좌 생성하기"}
        </Button>
      </div>

      {(error || success) && (
        <div className="md:col-span-2">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
        </div>
      )}
    </form>
  );
}
