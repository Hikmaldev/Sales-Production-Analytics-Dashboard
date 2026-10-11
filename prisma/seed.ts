// Development seed — run with `npm run db:seed`.
// Wipes and re-creates demo data so the dashboard has realistic content.
// Deterministic pseudo-random values keep charts stable across reseeds.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MS_PER_DAY = 86_400_000;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  // Reset first: truncate keeps foreign keys happy and restarts id sequences
  // so demo data always has predictable ids (branch 1..3, category 1..3, ...).
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE export_logs, sync_runs, sales_records, products, product_categories, branches, users RESTART IDENTITY CASCADE",
  );

  const random = mulberry32(20261010);

  // --- Users ---------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      passwordHash: await hash("admin12345", 10),
    },
  });
  await prisma.user.create({
    data: {
      name: "Viewer User",
      email: "viewer@example.com",
      role: "viewer",
      passwordHash: await hash("viewer12345", 10),
    },
  });

  // --- Branches ------------------------------------------------------------
  const branchSeeds = [
    { name: "Central Branch", region: "Central" },
    { name: "West Branch", region: "West" },
    { name: "East Branch", region: "East" },
  ];
  const branches = [];
  for (const seed of branchSeeds) {
    branches.push(await prisma.branch.create({ data: seed }));
  }

  // --- Categories & products ----------------------------------------------
  const productSeeds = [
    { name: "Espresso Machine", category: "Equipment", price: 15_000_000 },
    { name: "Coffee Grinder", category: "Equipment", price: 8_500_000 },
    { name: "Batch Brewer", category: "Equipment", price: 24_000_000 },
    { name: "Coffee Beans 1kg", category: "Consumables", price: 250_000 },
    { name: "Paper Filters", category: "Consumables", price: 45_000 },
    { name: "Cleaning Tablets", category: "Consumables", price: 90_000 },
    { name: "Installation Service", category: "Services", price: 1_500_000 },
    { name: "Machine Maintenance", category: "Services", price: 750_000 },
    { name: "Barista Training", category: "Services", price: 3_000_000 },
  ];

  const categoryNames = [...new Set(productSeeds.map((seed) => seed.category))];
  const categoryByName = new Map<string, bigint>();
  for (const name of categoryNames) {
    const category = await prisma.productCategory.create({ data: { name } });
    categoryByName.set(name, category.id);
  }

  const products: Array<{ id: bigint; price: number }> = [];
  for (const seed of productSeeds) {
    const product = await prisma.product.create({
      data: { name: seed.name, categoryId: categoryByName.get(seed.category)! },
    });
    products.push({ id: product.id, price: seed.price });
  }

  // --- Sales records: 180 days, growing with a weekly rhythm ---------------
  const dayCount = 180;
  const today = new Date();
  const endUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const records: Array<{
    branchId: bigint;
    productId: bigint;
    quantity: number;
    value: number;
    recordDate: Date;
    source: string;
  }> = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(endUtc - offset * MS_PER_DAY);
    const dayIndex = dayCount - 1 - offset;
    const weekday = date.getUTCDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const growth = 0.8 + (dayIndex / dayCount) * 0.45;
    const seasonal = 1 + 0.18 * Math.sin(dayIndex / 12);

    for (const branch of branches) {
      const recordCount = 2 + Math.floor(random() * 3); // 2..4 per day
      for (let index = 0; index < recordCount; index += 1) {
        const product = products[Math.floor(random() * products.length)];
        const quantity = 1 + Math.floor(random() * 18);
        const value =
          Math.round(
            quantity *
              product.price *
              weekendFactor *
              growth *
              seasonal *
              (0.9 + random() * 0.2) *
              100,
          ) / 100;
        records.push({
          branchId: branch.id,
          productId: product.id,
          quantity,
          value,
          recordDate: date,
          source: "seed",
        });
      }
    }
  }

  await prisma.salesRecord.createMany({ data: records });

  // --- Initial sync run so "last synced at" is populated -------------------
  await prisma.syncRun.create({
    data: {
      status: "success",
      source: "initial-load",
      recordCount: records.length,
      message: `Initial development data load: ${records.length} sales records.`,
      startedAt: new Date(Date.now() - 3_000),
      finishedAt: new Date(),
      triggeredByUserId: admin.id,
    },
  });

  console.log("Seed complete.");
  console.log("  admin@example.com / admin12345 (admin)");
  console.log("  viewer@example.com / viewer12345 (viewer)");
  console.log(
    `  ${branches.length} branches, ${categoryNames.length} categories, ${products.length} products, ${records.length} sales records.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
