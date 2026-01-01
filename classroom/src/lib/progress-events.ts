"use client";

export const PROGRESS_UPDATED_EVENT = "unova:progress-updated";

export type ProgressUpdatedDetail = {
  lessonId: string;
  percent: number;
  completed: boolean;
  // Optional extras (used for live UI sync like sidebar recent list)
  courseId?: string;
  courseTitle?: string;
  lessonTitle?: string | null;
};

export function emitProgressUpdated(detail: ProgressUpdatedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProgressUpdatedDetail>(PROGRESS_UPDATED_EVENT, { detail }));
}

export function onProgressUpdated(handler: (detail: ProgressUpdatedDetail) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (evt: Event) => {
    const e = evt as CustomEvent<ProgressUpdatedDetail>;
    if (!e?.detail) return;
    handler(e.detail);
  };
  window.addEventListener(PROGRESS_UPDATED_EVENT, listener);
  return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, listener);
}


