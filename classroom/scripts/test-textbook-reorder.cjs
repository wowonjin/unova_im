#!/usr/bin/env node
/**
 * Minimal smoke test for /api/admin/textbooks/reorder logic WITHOUT running the web server.
 * It verifies that reordering works when many textbooks have position=0 (legacy default).
 *
 * Requirements:
 * - DATABASE_URL must be set in the environment.
 * - This script will create and then delete a few test textbooks.
 */

const { PrismaClient } = require("@prisma/client");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("SKIP: DATABASE_URL is not set, cannot run reorder smoke test.");
    process.exit(0);
  }

  const prisma = new PrismaClient();
  const email = (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase().trim();

  const admin = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, name: "관리자", lastLoginAt: new Date() },
    select: { id: true, email: true },
  });

  const marker = `__reorder_test__${Date.now()}`;
  const created = [];
  for (let i = 0; i < 3; i++) {
    const t = await prisma.textbook.create({
      data: {
        ownerId: admin.id,
        // position intentionally omitted -> default 0 (legacy)
        title: `${marker} ${i}`,
        teacherName: "테스트",
        subjectName: "테스트",
        storedPath: `https://example.com/${marker}-${i}.pdf`,
        originalName: `${marker}-${i}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 0,
        isPublished: true,
      },
      select: { id: true, position: true },
    });
    created.push(t);
  }

  // emulate reorder route logic (the DB operations are what matter)
  const existing = await prisma.textbook.findMany({
    where: { ownerId: admin.id, id: { in: created.map((c) => c.id) } },
    select: { id: true, position: true },
    orderBy: [{ position: "desc" }, { createdAt: "desc" }],
  });

  const incoming = [created[2].id, created[0].id, created[1].id];
  const existingIds = new Set(existing.map((t) => t.id));
  const uniqueIncoming = [];
  const seen = new Set();
  for (const id of incoming) {
    if (!existingIds.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    uniqueIncoming.push(id);
  }
  const finalOrder = [...uniqueIncoming, ...existing.map((t) => t.id).filter((id) => !seen.has(id))];

  const maxPos = existing.reduce((acc, t) => Math.max(acc, t.position ?? 0), 0);
  const offset = Math.max(1000, maxPos + 1000);

  await prisma.textbook.updateMany({
    where: { ownerId: admin.id, position: { gt: 0 }, id: { in: finalOrder } },
    data: { position: { increment: offset } },
  });

  await prisma.$transaction(
    finalOrder.map((id, idx) =>
      prisma.textbook.update({
        where: { id },
        data: { position: finalOrder.length - idx },
      })
    )
  );

  const after = await prisma.textbook.findMany({
    where: { ownerId: admin.id, id: { in: finalOrder } },
    select: { id: true, position: true, title: true },
    orderBy: [{ position: "desc" }],
  });

  const idsAfter = after.map((r) => r.id);
  if (idsAfter.join(",") !== finalOrder.join(",")) {
    console.error("FAIL: order mismatch");
    console.error({ expected: finalOrder, got: idsAfter });
    process.exitCode = 1;
  } else {
    console.log("OK: reorder applied");
  }

  // cleanup
  await prisma.textbook.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});


