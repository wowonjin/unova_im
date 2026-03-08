const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_WIDTH = 640;
const DEFAULT_QUALITY = 72;

function loadEnvFile(filePath, override = false) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

function makeDataUrl(mimeType, bytes) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function shouldUsePgSsl(dbUrl) {
  if (process.env.PGSSLMODE === "require") return true;
  try {
    const u = new URL(dbUrl);
    const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
    const ssl = (u.searchParams.get("ssl") || "").toLowerCase();
    if (sslmode === "require") return true;
    if (ssl === "true" || ssl === "1") return true;
    if (u.hostname.endsWith(".render.com")) return true;
    if (u.hostname.startsWith("dpg-")) return true;
  } catch {
    // ignore
  }
  return false;
}

function createPrismaClient() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: shouldUsePgSsl(dbUrl) ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function optimizeDataUrl(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;

  if (parsed.mimeType === "image/svg+xml" || parsed.mimeType === "image/gif") {
    return {
      dataUrl,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.bytes.length,
    };
  }

  try {
    const optimized = await sharp(parsed.bytes, { limitInputPixels: false })
      .rotate()
      .resize({ width: DEFAULT_WIDTH, withoutEnlargement: true })
      .webp({ quality: DEFAULT_QUALITY, effort: 4 })
      .toBuffer();

    if (optimized.length >= parsed.bytes.length) {
      return {
        dataUrl,
        mimeType: parsed.mimeType,
        sizeBytes: parsed.bytes.length,
      };
    }

    return {
      dataUrl: makeDataUrl("image/webp", optimized),
      mimeType: "image/webp",
      sizeBytes: optimized.length,
    };
  } catch (error) {
    console.error("[optimize-thumbnail-data-urls] optimize failed:", error);
    return {
      dataUrl,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.bytes.length,
    };
  }
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env"));
  loadEnvFile(path.join(ROOT, ".env.local"), true);

  const prisma = createPrismaClient();

  try {
    const [courses, textbooks] = await Promise.all([
      prisma.course.findMany({
        where: { thumbnailUrl: { startsWith: "data:" } },
        select: { id: true, thumbnailUrl: true },
      }),
      prisma.textbook.findMany({
        where: { thumbnailUrl: { startsWith: "data:" } },
        select: { id: true, thumbnailUrl: true },
      }),
    ]);

    const stats = {
      coursesScanned: courses.length,
      textbooksScanned: textbooks.length,
      coursesUpdated: 0,
      textbooksUpdated: 0,
      bytesBefore: 0,
      bytesAfter: 0,
    };

    for (const course of courses) {
      if (!course.thumbnailUrl) continue;
      const parsed = parseDataUrl(course.thumbnailUrl);
      if (!parsed) continue;
      stats.bytesBefore += parsed.bytes.length;

      const optimized = await optimizeDataUrl(course.thumbnailUrl);
      if (!optimized) continue;
      stats.bytesAfter += optimized.sizeBytes;

      if (optimized.dataUrl === course.thumbnailUrl) continue;

      await prisma.course.update({
        where: { id: course.id },
        data: {
          thumbnailUrl: optimized.dataUrl,
          thumbnailMimeType: optimized.mimeType,
          thumbnailSizeBytes: optimized.sizeBytes,
        },
      });
      stats.coursesUpdated += 1;
    }

    for (const textbook of textbooks) {
      if (!textbook.thumbnailUrl) continue;
      const parsed = parseDataUrl(textbook.thumbnailUrl);
      if (!parsed) continue;
      stats.bytesBefore += parsed.bytes.length;

      const optimized = await optimizeDataUrl(textbook.thumbnailUrl);
      if (!optimized) continue;
      stats.bytesAfter += optimized.sizeBytes;

      if (optimized.dataUrl === textbook.thumbnailUrl) continue;

      await prisma.textbook.update({
        where: { id: textbook.id },
        data: {
          thumbnailUrl: optimized.dataUrl,
        },
      });
      stats.textbooksUpdated += 1;
    }

    const savedBytes = Math.max(0, stats.bytesBefore - stats.bytesAfter);
    console.log(
      JSON.stringify(
        {
          ...stats,
          savedBytes,
          savedMB: Number((savedBytes / 1024 / 1024).toFixed(2)),
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
