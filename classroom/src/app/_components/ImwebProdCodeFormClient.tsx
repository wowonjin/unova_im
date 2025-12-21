"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Field, HelpTip, Input } from "@/app/_components/ui";

export default function ImwebProdCodeFormClient({
  courseId,
  initialCode,
}: {
  courseId: string;
  initialCode: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const actionUrl = useMemo(() => "/api/admin/courses/update-imweb", []);

  const submit = async () => {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      fd.set("imwebProdCode", code);

      const res = await fetch(actionUrl, {
        method: "POST",
        body: fd,
        redirect: "manual",
      });

      // Success path uses redirects (307) to show a message via query string.
      const loc = res.headers.get("location");
      if (loc) {
        router.push(loc);
        return;
      }

      if (!res.ok) {
        // Fallback: show a stable error state via query string.
        const next = new URL(pathname, window.location.origin);
        const qs = new URLSearchParams(sp.toString());
        qs.set("tab", "settings");
        qs.set("imweb", "error");
        next.search = qs.toString();
        router.push(next.toString());
        return;
      }

      // If the platform follows redirects automatically (some environments),
      // just refresh to reflect latest state.
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-12"
      action={actionUrl}
      method="post"
      onSubmit={(e) => {
        // Avoid flaky behavior around form submission enhancement in some deployments.
        e.preventDefault();
        void submit();
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <div className="md:col-span-12">
        <Field
          label={
            <span className="inline-flex items-center">
              상품 코드
              <HelpTip text="아임웹 상품에 설정한 ‘상품 코드’(prod_custom_code)와 똑같이 입력하세요. 이 코드로 결제 상품이 어떤 강좌인지 연결됩니다." />
            </span>
          }
          hint="예: conphy2_1"
        >
          <Input
            name="imwebProdCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="예: conphy2_1"
            className="bg-transparent"
          />
        </Field>
      </div>
      <div className="md:col-span-12 flex items-center justify-between">
        <p className="text-xs text-white/50">
          비워두고 저장하면 연동이 해제됩니다.
          <span className="ml-2">
            <HelpTip text="자동 발급이 실제로 되려면 아임웹 ‘결제 완료 알림(웹훅)’ 설정과 서버 환경변수(IMWEB_WEBHOOK_TOKEN, IMWEB_API_KEY, IMWEB_API_SECRET)가 필요합니다." />
          </span>
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}


