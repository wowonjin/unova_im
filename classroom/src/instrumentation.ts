declare global {
  // Prevent duplicate timers across hot reloads or multi-imports.
  // eslint-disable-next-line no-var
  var __unovaMemLoggerStarted: boolean | undefined;
}

function logMemory(tag: string) {
  const m = process.memoryUsage();
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
  // Keep format simple for log parsing.
  // eslint-disable-next-line no-console
  console.log(
    `[mem] ${tag} rss=${toMb(m.rss)}MB heapUsed=${toMb(m.heapUsed)}MB heapTotal=${toMb(m.heapTotal)}MB external=${toMb(
      m.external
    )}MB arrayBuffers=${toMb(m.arrayBuffers)}MB`
  );
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (global.__unovaMemLoggerStarted) return;
  global.__unovaMemLoggerStarted = true;

  const intervalMs = (() => {
    const raw = process.env.MEM_LOG_INTERVAL_MS;
    const v = raw ? Number(raw) : NaN;
    return Number.isFinite(v) && v >= 5000 ? v : 60_000;
  })();

  logMemory("boot");
  setInterval(() => logMemory("interval"), intervalMs).unref?.();

}
