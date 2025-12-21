const { PrismaClient } = require("@prisma/client");

function createPrisma() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  const isPostgres = dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));

  if (isPostgres) {
    const { Pool } = require("pg");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

  const dbPath = process.env.DATABASE_PATH || "dev.db";
  const sqliteUrl = dbUrl && dbUrl.startsWith("file:") ? dbUrl : `file:${dbPath}`;
  const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrisma();
  try {
    console.log("PrismaClient has notice delegate:", Boolean(prisma.notice));
    // print Notice fields according to runtime data model
    const model = prisma._runtimeDataModel?.models?.Notice;
    const fields = model?.fields?.map((f) => f.name) ?? [];
    console.log("Notice fields:", fields);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


