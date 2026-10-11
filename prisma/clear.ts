// Empties every table so the app runs in a clean, no-data state
// (e.g. before loading a real dataset). Requires --yes to confirm.
//
// Usage: npm run db:clear -- --yes

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  if (!process.argv.includes("--yes")) {
    throw new Error(
      "Refusing to clear: pass --yes to confirm (this deletes all rows).",
    );
  }

  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE export_logs, sync_runs, sales_records, products, product_categories, branches, users RESTART IDENTITY CASCADE",
  );
  console.log("All tables cleared.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
