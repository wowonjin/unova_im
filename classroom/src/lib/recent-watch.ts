export type RecentWatchedItem = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string | null;
  watchedAtISO: string;
};

const KEY_PREFIX = "unova_recent_watched_v1:";

function getKey(userKey: string) {
  return `${KEY_PREFIX}${userKey}`;
}

export function readRecentWatched(userKey: string, limit = 6): RecentWatchedItem[] {
  if (typeof window === "undefined") return [];
  const key = getKey(userKey);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: RecentWatchedItem[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const item = x as Partial<RecentWatchedItem>;
      if (typeof item.courseId !== "string" || !item.courseId) continue;
      if (typeof item.courseTitle !== "string" || !item.courseTitle) continue;
      if (typeof item.lessonId !== "string" || !item.lessonId) continue;
      const lessonTitle = typeof item.lessonTitle === "string" ? item.lessonTitle : null;
      const watchedAtISO = typeof item.watchedAtISO === "string" && item.watchedAtISO ? item.watchedAtISO : null;
      if (!watchedAtISO) continue;
      out.push({
        courseId: item.courseId,
        courseTitle: item.courseTitle,
        lessonId: item.lessonId,
        lessonTitle,
        watchedAtISO,
      });
    }
    return out.slice(0, Math.max(0, limit));
  } catch {
    return [];
  }
}

export function writeRecentWatched(userKey: string, items: RecentWatchedItem[], limit = 6) {
  if (typeof window === "undefined") return;
  const key = getKey(userKey);
  try {
    const sliced = items.slice(0, Math.max(0, limit));
    window.localStorage.setItem(key, JSON.stringify(sliced));
  } catch {
    // ignore
  }
}

export function recordRecentWatch(
  userKey: string,
  item: Omit<RecentWatchedItem, "watchedAtISO"> & { watchedAtISO?: string },
  limit = 6
) {
  if (typeof window === "undefined") return;
  const nowISO = item.watchedAtISO ?? new Date().toISOString();
  const current = readRecentWatched(userKey, 50);
  const next: RecentWatchedItem[] = [
    {
      courseId: item.courseId,
      courseTitle: item.courseTitle,
      lessonId: item.lessonId,
      lessonTitle: item.lessonTitle ?? null,
      watchedAtISO: nowISO,
    },
    ...current.filter((x) => x.courseId !== item.courseId),
  ];
  writeRecentWatched(userKey, next, limit);
}


