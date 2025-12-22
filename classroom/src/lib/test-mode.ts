/**
 * Test-mode helpers to bypass enrollment/paywall checks.
 *
 * Safety model:
 * - Query param `?all=1` enables bypass ONLY when NODE_ENV !== "production"
 * - Explicit env flag enables bypass even in production builds (use carefully on staging).
 */
export function isAllCoursesTestModeFromAllParam(allParam: string | null | undefined): boolean {
  const byQuery = allParam === "1" && process.env.NODE_ENV !== "production";
  const byEnv =
    process.env.UNOVA_TEST_SHOW_ALL_COURSES === "1" ||
    process.env.TEST_SHOW_ALL_COURSES === "1" ||
    process.env.NEXT_PUBLIC_UNOVA_TEST_SHOW_ALL_COURSES === "1" ||
    process.env.NEXT_PUBLIC_TEST_SHOW_ALL_COURSES === "1";
  return Boolean(byEnv || byQuery);
}

export function isAllCoursesTestModeFromRequest(req: Request): boolean {
  try {
    const url = new URL(req.url);
    return isAllCoursesTestModeFromAllParam(url.searchParams.get("all"));
  } catch {
    return isAllCoursesTestModeFromAllParam(null);
  }
}

export function withAllParamIfNeeded(href: string, enabled: boolean): string {
  if (!enabled) return href;
  try {
    // Absolute URL
    const url = new URL(href);
    url.searchParams.set("all", "1");
    return url.toString();
  } catch {
    // Relative URL
    const u = new URL(href, "http://local");
    u.searchParams.set("all", "1");
    const qs = u.searchParams.toString();
    return qs ? `${u.pathname}?${qs}` : u.pathname;
  }
}


