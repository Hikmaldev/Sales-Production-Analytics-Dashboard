import { beforeEach } from "vitest";

import { prisma } from "../server/db";

// Isolate every test: start and end each one with empty tables.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE export_logs, sync_runs, sales_records, products, product_categories, branches, users RESTART IDENTITY CASCADE",
  );
});
