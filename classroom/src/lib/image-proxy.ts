export type ImageProxyVersion = string | number | Date | null | undefined;

function toIso(v: ImageProxyVersion): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  return s.length ? s : null;
}

export function normalizeExternalAssetUrl(input: string): string {
  const s = String(input || "").trim();
  if (!s) return "";
  // gs://bucket/path -> https://storage.googleapis.com/bucket/path
  if (s.toLowerCase().startsWith("gs://")) return `https://storage.googleapis.com/${s.slice("gs://".length)}`;
  return s;
}

export function toImageProxyUrl(imageUrl: string, version?: ImageProxyVersion): string {
  const raw = String(imageUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  // relative path (same-origin assets) should not go through proxy
  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) return raw;

  const normalized = normalizeExternalAssetUrl(raw);
  const v = toIso(version);

  return `/api/image-proxy?url=${encodeURIComponent(normalized)}${v ? `&v=${encodeURIComponent(v)}` : ""}`;
}

