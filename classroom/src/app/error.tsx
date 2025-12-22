"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = (error?.message || "").toLowerCase();
  const looksLikeMissingDbEnv =
    msg.includes("database_url") ||
    msg.includes("postgres_url") ||
    msg.includes("postgres_prisma_url") ||
    msg.includes("requires postgres") ||
    msg.includes("prisma");

  return (
    <html lang="ko">
      <body style={{ background: "#0b0b0b", color: "#fff", padding: 24, fontFamily: "system-ui" }}>
        <h2 style={{ margin: "0 0 12px" }}>서버 오류가 발생했습니다.</h2>
        {looksLikeMissingDbEnv ? (
          <p style={{ margin: "0 0 12px", opacity: 0.8 }}>
            운영(Render)에서는 DB(Postgres) 환경변수 설정이 필요합니다. Render 서비스의 Environment에{" "}
            <code>DATABASE_URL</code> (또는 <code>POSTGRES_PRISMA_URL</code>/<code>POSTGRES_URL_NON_POOLING</code>/
            <code>POSTGRES_URL</code>)을 설정한 뒤 다시 배포하세요.
          </p>
        ) : (
          <p style={{ margin: "0 0 12px", opacity: 0.8 }}>잠시 후 다시 시도해주세요.</p>
        )}
        {error?.digest ? (
          <p style={{ margin: "0 0 16px", opacity: 0.7 }}>
            Digest: <code>{error.digest}</code>
          </p>
        ) : null}
        <button
          onClick={() => reset()}
          style={{
            background: "#fff",
            color: "#111",
            border: 0,
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}


