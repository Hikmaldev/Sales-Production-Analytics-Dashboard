import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const TRUNCATE_SQL =
  "TRUNCATE TABLE export_logs, sync_runs, sales_records, products, product_categories, branches, users RESTART IDENTITY CASCADE";

/**
 * Runs once before the suite (Vitest main process).
 * 1. Refuses to run if the test URL points at the development database.
 * 2. Truncates every table so the suite starts from an empty schema.
 */
export default async function globalSetup(): Promise<void> {
  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    throw new Error("DATABASE_URL (test) is not set.");
  }

  const mainUrl = dotenv.config({ path: ".env" }).parsed?.DATABASE_URL ?? "";
  const hostOf = (url: string) => /@([^/]+)\//.exec(url)?.[1] ?? null;

  if (!hostOf(testUrl) || hostOf(testUrl) === hostOf(mainUrl)) {
    throw new Error(
      "Refusing to run: the test database host matches the development database host. Check .env.test.",
    );
  }

  const adapter = new PrismaPg({ connectionString: testUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL);
    console.log(`Test database ready (${hostOf(testUrl)}).`);
  } finally {
    await prisma.$disconnect();
  }
}
