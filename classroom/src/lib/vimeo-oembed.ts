type VimeoOembed = {
  title?: unknown;
  duration?: unknown;
};

export function normalizeVimeoVideoId(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  // Allow plain numeric ID
  if (/^\d+$/.test(raw)) return raw;

  // Try to extract from common Vimeo URLs:
  // - https://vimeo.com/123
  // - https://player.vimeo.com/video/123
  // - ...?v=123 etc (best-effort)
  const m =
    raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i) ||
    raw.match(/player\.vimeo\.com\/video\/(\d+)/i) ||
    raw.match(/(?:^|[^\d])(\d{6,})$/); // fallback: trailing long-ish number
  const id = m?.[1] ?? null;
  return id && /^\d+$/.test(id) ? id : null;
}

export async function fetchVimeoOembedMeta(
  vimeoVideoIdOrUrl: string
): Promise<{ title: string | null; durationSeconds: number | null }> {
  const id = normalizeVimeoVideoId(vimeoVideoIdOrUrl);
  if (!id) return { title: null, durationSeconds: null };

  // Vimeo oEmbed (no auth). Example:
  // https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/123456789
  const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(oembedUrl, {
      method: "GET",
      signal: controller.signal,
      // Explicit UA helps some edge cases
      headers: { "user-agent": "unova-classroom/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return { title: null, durationSeconds: null };
    const data = (await res.json().catch(() => null)) as VimeoOembed | null;

    const rawTitle = (data as any)?.title;
    const title = typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : null;

    const rawDuration = (data as any)?.duration;
    const durationSeconds =
      typeof rawDuration === "number" && Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : null;

    return { title, durationSeconds };
  } catch {
    return { title: null, durationSeconds: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchVimeoDurationSeconds(vimeoVideoId: string): Promise<number | null> {
  const meta = await fetchVimeoOembedMeta(vimeoVideoId);
  return meta.durationSeconds;
}


