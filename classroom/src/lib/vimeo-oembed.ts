export async function fetchVimeoDurationSeconds(vimeoVideoId: string): Promise<number | null> {
  const id = (vimeoVideoId || "").trim();
  if (!id) return null;

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
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as unknown;
    const duration = (data as any)?.duration;
    if (typeof duration !== "number") return null;
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return Math.round(duration);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}


