"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = (error?.message || "").toLowerCase();
  // NOTE:
  // Prisma 에러는 다양합니다(스키마 불일치/마이그레이션 누락/검증 에러 등).
  // 여기서는 "DB 환경변수 누락/잘못된 연결 문자열" 케이스만 선별해서 안내합니다.
  const looksLikeMissingDbEnv =
    msg.includes("database_url is not set") ||
    msg.includes("set database_url") ||
    msg.includes("requires postgres") ||
    msg.includes("must be a postgres connection string") ||
    msg.includes("postgres_prisma_url") ||
    msg.includes("postgres_url_non_pooling") ||
    msg.includes("postgres_url");

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  const isRenderHost = host.endsWith(".onrender.com");

  return (
    <div style={{ background: "#0b0b0b", color: "#fff", minHeight: "100vh", padding: 24, fontFamily: "system-ui" }}>
        <h2 style={{ margin: "0 0 12px" }}>서버 오류가 발생했습니다.</h2>
        {looksLikeMissingDbEnv ? (
          <p style={{ margin: "0 0 12px", opacity: 0.8 }}>
            {isLocalhost
              ? "로컬(내 컴퓨터)에서 실행하려면 프로젝트의 `classroom/.env` 파일에 DB(Postgres) 연결 문자열을 설정해야 합니다."
              : isRenderHost
                ? "운영(Render)에서는 DB(Postgres) 환경변수 설정이 필요합니다. Render 서비스의 Environment에"
                : "운영 환경에서는 DB(Postgres) 환경변수 설정이 필요합니다. 배포 환경의 Environment에"}{" "}
            <code>DATABASE_URL</code> (또는 <code>POSTGRES_PRISMA_URL</code>/<code>POSTGRES_URL_NON_POOLING</code>/
            <code>POSTGRES_URL</code>)
            {isLocalhost ? "을 설정한 뒤 개발 서버를 재시작하세요." : "을 설정한 뒤 다시 배포하세요."}
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
    </div>
  );
}


