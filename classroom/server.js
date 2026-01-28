const http = require("http");
const { parse } = require("url");
const { randomUUID } = require("crypto");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

const slowMs = (() => {
  const v = Number(process.env.REQ_LOG_SLOW_MS);
  return Number.isFinite(v) && v > 0 ? v : 1000;
})();

const memIntervalMs = (() => {
  const v = Number(process.env.MEM_LOG_INTERVAL_MS);
  return Number.isFinite(v) && v >= 5000 ? v : 60_000;
})();

const sampleRate = (() => {
  const v = Number(process.env.REQ_LOG_SAMPLE_RATE);
  return Number.isFinite(v) && v >= 0 ? Math.min(1, v) : 0.01;
})();

function logMemory(tag) {
  const m = process.memoryUsage();
  const toMb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;
  // eslint-disable-next-line no-console
  console.log(
    `[mem] ${tag} rss=${toMb(m.rss)}MB heapUsed=${toMb(m.heapUsed)}MB heapTotal=${toMb(m.heapTotal)}MB external=${toMb(
      m.external
    )}MB arrayBuffers=${toMb(m.arrayBuffers)}MB`
  );
}

function toSafeText(v, maxLen) {
  const s = String(v ?? "");
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...`;
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const start = process.hrtime.bigint();
    const reqId = req.headers["x-request-id"] || randomUUID();
    res.setHeader("x-request-id", reqId);

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.statusCode || 0;
      const shouldLog = status >= 500 || durationMs >= slowMs || Math.random() < sampleRate;
      if (!shouldLog) return;

      const ipHeader = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      const ip = String(ipHeader).split(",")[0]?.trim() || "";
      const ua = toSafeText(req.headers["user-agent"], 200);
      const bytes = res.getHeader("content-length") || "-";
      const parsedUrl = parse(req.url || "/", false);
      const path = `${parsedUrl.pathname || "/"}${parsedUrl.search || ""}`;

      // eslint-disable-next-line no-console
      console.log(
        `[access] method=${req.method} status=${status} durationMs=${durationMs.toFixed(
          1
        )} bytes=${bytes} ip="${ip}" reqId="${reqId}" path="${path}" ua="${ua}"`
      );
    });

    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    // eslint-disable-next-line no-console
    console.log(`> Ready on http://localhost:${port}`);
    logMemory("boot");
    setInterval(() => logMemory("interval"), memIntervalMs).unref?.();
  });
});
