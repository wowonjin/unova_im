const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
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


