import sharp from "sharp";

type OptimizeOptions = {
  width?: number;
  quality?: number;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_QUALITY = 72;

function makeDataUrl(mimeType: string, bytes: Buffer): string {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } | null {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  try {
    return {
      mimeType: match[1],
      bytes: Buffer.from(match[2], "base64"),
    };
  } catch {
    return null;
  }
}

async function optimizeToWebp(
  bytes: Buffer,
  mimeType: string,
  options?: OptimizeOptions
): Promise<{ mimeType: string; bytes: Buffer }> {
  const width = options?.width ?? DEFAULT_WIDTH;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  // SVG/GIF 등은 원본 유지가 더 안전합니다.
  if (mimeType === "image/svg+xml" || mimeType === "image/gif") {
    return { mimeType, bytes };
  }

  try {
    const optimized = await sharp(bytes, { limitInputPixels: false })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (optimized.length >= bytes.length) {
      return { mimeType, bytes };
    }

    return { mimeType: "image/webp", bytes: optimized };
  } catch {
    return { mimeType, bytes };
  }
}

export async function optimizeThumbnailUpload(
  bytes: Buffer,
  mimeType: string,
  options?: OptimizeOptions
): Promise<{ dataUrl: string; mimeType: string; sizeBytes: number; bytes: Buffer }> {
  const optimized = await optimizeToWebp(bytes, mimeType, options);
  return {
    dataUrl: makeDataUrl(optimized.mimeType, optimized.bytes),
    mimeType: optimized.mimeType,
    sizeBytes: optimized.bytes.length,
    bytes: optimized.bytes,
  };
}

export async function optimizeThumbnailDataUrl(
  dataUrl: string,
  options?: OptimizeOptions
): Promise<{ dataUrl: string; mimeType: string; sizeBytes: number; bytes: Buffer | null }> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return {
      dataUrl,
      mimeType: "application/octet-stream",
      sizeBytes: Buffer.byteLength(dataUrl),
      bytes: null,
    };
  }

  const optimized = await optimizeToWebp(parsed.bytes, parsed.mimeType, options);
  return {
    dataUrl: makeDataUrl(optimized.mimeType, optimized.bytes),
    mimeType: optimized.mimeType,
    sizeBytes: optimized.bytes.length,
    bytes: optimized.bytes,
  };
}
