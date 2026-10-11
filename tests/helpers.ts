import { hash } from "bcryptjs";
import request from "supertest";

import { createApp } from "../server/app";
import { prisma } from "../server/db";

/** The Express app under test (no listening socket; supertest drives it). */
export const app = createApp();

export const TEST_PASSWORD = "password123";
export const V1 = "/api/v1";

export function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Date helpers (UTC, ISO YYYY-MM-DD) -----------------------------------

export function utcDay(offset: number): string {
  const now = new Date();
  const base = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
}

export function utcDate(offset: number): Date {
  return new Date(`${utcDay(offset)}T00:00:00.000Z`);
}

// --- Factories -------------------------------------------------------------

let userCounter = 0;

export async function createUser(
  role: "viewer" | "admin" = "viewer",
  overrides: {
    name?: string;
    email?: string;
    isActive?: boolean;
    password?: string;
  } = {},
) {
  userCounter += 1;
  return prisma.user.create({
    data: {
      name: overrides.name ?? `Test ${role} ${userCounter}`,
      email: overrides.email ?? `${role}-${userCounter}@example.com`,
      role,
      isActive: overrides.isActive ?? true,
      // Low cost factor: tests only need compare() to succeed.
      passwordHash: await hash(overrides.password ?? TEST_PASSWORD, 4),
    },
  });
}

export async function loginAs(
  role: "viewer" | "admin",
  overrides: Parameters<typeof createUser>[1] = {},
) {
  const user = await createUser(role, overrides);
  const response = await request(app)
    .post(`${V1}/login`)
    .send({ email: user.email, password: overrides.password ?? TEST_PASSWORD });
  if (response.status !== 200) {
    throw new Error(`Login failed in test helper (status ${response.status}).`);
  }
  return { user, token: response.body.token as string };
}

export async function createBranch(name: string, region: string | null = null) {
  return prisma.branch.create({ data: { name, region } });
}

export async function createCategory(name: string) {
  return prisma.productCategory.create({ data: { name } });
}

export async function createProduct(categoryId: bigint, name: string) {
  return prisma.product.create({ data: { name, categoryId } });
}

export async function createRecord(input: {
  branchId: bigint;
  productId: bigint;
  quantity: number;
  value: number | null;
  dayOffset: number;
}) {
  return prisma.salesRecord.create({
    data: {
      branchId: input.branchId,
      productId: input.productId,
      quantity: input.quantity,
      value: input.value,
      recordDate: utcDate(input.dayOffset),
      source: "test",
    },
  });
}

/**
 * Deterministic dataset used by the dashboard and export suites.
 *
 * Records (dayOffset -> branch/product/quantity/value):
 *   -40  A/PX  1 / 700
 *   -30  B/PY  1 / 1000
 *   -20  B/PY  4 / null   (production-style row without a value)
 *    -8  B/PY  2 / 400
 *    -2  A/PX  2 / 100
 *    -1  A/PY  3 / 200
 *    -1  B/PX  5 / 500
 *
 * Last 7 days (-6..0): totalSales 800, units 10, previous period 400 -> +100%.
 */
export async function seedDashboardScenario() {
  const branchA = await createBranch("Branch A");
  const branchB = await createBranch("Branch B");
  const categoryX = await createCategory("Category X");
  const categoryY = await createCategory("Category Y");
  const productX = await createProduct(categoryX.id, "Product X");
  const productY = await createProduct(categoryY.id, "Product Y");

  await createRecord({ branchId: branchA.id, productId: productX.id, quantity: 1, value: 700, dayOffset: -40 });
  await createRecord({ branchId: branchB.id, productId: productY.id, quantity: 1, value: 1000, dayOffset: -30 });
  await createRecord({ branchId: branchB.id, productId: productY.id, quantity: 4, value: null, dayOffset: -20 });
  await createRecord({ branchId: branchB.id, productId: productY.id, quantity: 2, value: 400, dayOffset: -8 });
  await createRecord({ branchId: branchA.id, productId: productX.id, quantity: 2, value: 100, dayOffset: -2 });
  await createRecord({ branchId: branchA.id, productId: productY.id, quantity: 3, value: 200, dayOffset: -1 });
  await createRecord({ branchId: branchB.id, productId: productX.id, quantity: 5, value: 500, dayOffset: -1 });

  return { branchA, branchB, categoryX, categoryY, productX, productY };
}
