import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "../server/db";
import {
  app,
  auth,
  loginAs,
  seedDashboardScenario,
  utcDay,
  V1,
} from "./helpers";

const lastWeek = `start=${utcDay(-6)}&end=${utcDay(0)}`;

describe("branch/category relations and deactivation rules (PRD §11.2)", () => {
  it("creates a branch and lists it immediately for filters and admin", async () => {
    const { token } = await loginAs("admin");
    const created = await request(app)
      .post(`${V1}/branches`)
      .set(auth(token))
      .send({ name: "North Branch", region: "North" });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "North Branch",
      region: "North",
      isActive: true,
      recordCount: 0,
    });

    const all = await request(app).get(`${V1}/branches`).set(auth(token));
    expect(all.body.map((item: { name: string }) => item.name)).toEqual([
      "North Branch",
    ]);

    const active = await request(app)
      .get(`${V1}/branches?active=true`)
      .set(auth(token));
    expect(active.body).toHaveLength(1);
  });

  it("rejects duplicate branch names case-insensitively", async () => {
    const { token } = await loginAs("admin");
    await request(app)
      .post(`${V1}/branches`)
      .set(auth(token))
      .send({ name: "Central" })
      .expect(201);

    const duplicate = await request(app)
      .post(`${V1}/branches`)
      .set(auth(token))
      .send({ name: "  central " });
    expect(duplicate.status).toBe(409);
  });

  it("counts historical records per branch and per category", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("admin");

    const branches = await request(app).get(`${V1}/branches`).set(auth(token));
    const branchA = branches.body.find(
      (item: { id: number }) => item.id === Number(scenario.branchA.id),
    );
    const branchB = branches.body.find(
      (item: { id: number }) => item.id === Number(scenario.branchB.id),
    );
    expect(branchA.recordCount).toBe(3);
    expect(branchB.recordCount).toBe(4);

    const categories = await request(app)
      .get(`${V1}/product-categories`)
      .set(auth(token));
    const categoryX = categories.body.find(
      (item: { id: number }) => item.id === Number(scenario.categoryX.id),
    );
    const categoryY = categories.body.find(
      (item: { id: number }) => item.id === Number(scenario.categoryY.id),
    );
    expect(categoryX).toMatchObject({ productCount: 1, recordCount: 3 });
    expect(categoryY).toMatchObject({ productCount: 1, recordCount: 4 });
  });

  it("deactivates a branch: hidden from active filters, history intact", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("admin");

    const patched = await request(app)
      .patch(`${V1}/branches/${scenario.branchB.id}`)
      .set(auth(token))
      .send({ isActive: false });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ isActive: false, recordCount: 4 });

    const active = await request(app)
      .get(`${V1}/branches?active=true`)
      .set(auth(token));
    expect(active.body.map((item: { name: string }) => item.name)).toEqual([
      "Branch A",
    ]);

    // Historical comparisons keep the inactive branch.
    const comparison = await request(app)
      .get(`${V1}/dashboard/branch-comparison?${lastWeek}`)
      .set(auth(token));
    expect(
      comparison.body.items.map((item: { name: string }) => item.name),
    ).toContain("Branch B");
  });

  it("keeps historical summaries available for a deactivated branch", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("admin");

    await request(app)
      .patch(`${V1}/branches/${scenario.branchB.id}`)
      .set(auth(token))
      .send({ isActive: false })
      .expect(200);

    const summary = await request(app)
      .get(`${V1}/dashboard/summary?${lastWeek}&branch=${scenario.branchB.id}`)
      .set(auth(token));
    expect(summary.body.totalSales).toBe(500);
  });

  it("reactivates a deactivated branch", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("admin");

    await request(app)
      .patch(`${V1}/branches/${scenario.branchA.id}`)
      .set(auth(token))
      .send({ isActive: false })
      .expect(200);

    const restored = await request(app)
      .patch(`${V1}/branches/${scenario.branchA.id}`)
      .set(auth(token))
      .send({ isActive: true });
    expect(restored.body.isActive).toBe(true);
  });

  it("returns 404 when patching a missing branch", async () => {
    const { token } = await loginAs("admin");
    const response = await request(app)
      .patch(`${V1}/branches/999999`)
      .set(auth(token))
      .send({ isActive: false });
    expect(response.status).toBe(404);
  });

  it("blocks hard deletes while sales records reference the branch", async () => {
    const scenario = await seedDashboardScenario();
    await expect(
      prisma.branch.delete({ where: { id: scenario.branchA.id } }),
    ).rejects.toThrow();
  });

  it("creates categories and rejects duplicates", async () => {
    const { token } = await loginAs("admin");
    const created = await request(app)
      .post(`${V1}/product-categories`)
      .set(auth(token))
      .send({ name: "Spare Parts" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "Spare Parts",
      isActive: true,
      productCount: 0,
      recordCount: 0,
    });

    const duplicate = await request(app)
      .post(`${V1}/product-categories`)
      .set(auth(token))
      .send({ name: "spare parts" });
    expect(duplicate.status).toBe(409);
  });

  it("deactivates a category without touching historical records", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("admin");

    const patched = await request(app)
      .patch(`${V1}/product-categories/${scenario.categoryX.id}`)
      .set(auth(token))
      .send({ isActive: false });
    expect(patched.body).toMatchObject({
      isActive: false,
      productCount: 1,
      recordCount: 3,
    });

    const active = await request(app)
      .get(`${V1}/product-categories?active=true`)
      .set(auth(token));
    expect(active.body.map((item: { name: string }) => item.name)).toEqual([
      "Category Y",
    ]);

    const comparison = await request(app)
      .get(`${V1}/dashboard/category-comparison?${lastWeek}`)
      .set(auth(token));
    expect(
      comparison.body.items.map((item: { name: string }) => item.name),
    ).toContain("Category X");
  });
});
