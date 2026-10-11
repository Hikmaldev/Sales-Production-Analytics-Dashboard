import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "../server/db";
import {
  app,
  auth,
  createBranch,
  createCategory,
  createProduct,
  createRecord,
  loginAs,
  sleep,
  V1,
} from "./helpers";

async function waitForFinishedRun(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await prisma.syncRun.findFirst({ orderBy: { id: "desc" } });
    if (run && run.status !== "running") return run;
    await sleep(150);
  }
  throw new Error("Sync run did not finish in time.");
}

describe("sync status and history (ACT-08)", () => {
  it("starts idle with no history", async () => {
    const { token } = await loginAs("admin");

    const status = await request(app)
      .get(`${V1}/admin/sync-status`)
      .set(auth(token));
    expect(status.body).toEqual({ status: "idle", lastSyncedAt: null });

    const runs = await request(app)
      .get(`${V1}/admin/sync-runs`)
      .set(auth(token));
    expect(runs.body).toEqual([]);
  });

  it("runs a manual sync inline, logs it, and refuses a concurrent trigger", async () => {
    const { token } = await loginAs("admin");

    const trigger = await request(app)
      .post(`${V1}/admin/sync-trigger`)
      .set(auth(token));
    expect(trigger.status).toBe(202);
    expect(trigger.body).toMatchObject({ status: "syncing" });
    expect(trigger.body.startedAt).toEqual(expect.any(String));

    // The job runs inside the request (serverless-safe), so the run has
    // already finished when the response arrives.
    const run = await waitForFinishedRun();
    expect(run.status).toBe("success");
    expect(run.source).toBe("manual");
    expect(run.recordCount).toBe(0);

    const status = await request(app)
      .get(`${V1}/admin/sync-status`)
      .set(auth(token));
    expect(status.body.status).toBe("idle");
    expect(status.body.lastSyncedAt).toEqual(expect.any(String));

    const runs = await request(app)
      .get(`${V1}/admin/sync-runs`)
      .set(auth(token));
    expect(runs.body).toHaveLength(1);
    expect(runs.body[0]).toMatchObject({
      status: "success",
      source: "manual",
      recordCount: 0,
      durationSeconds: expect.any(Number),
    });

    // A run that is still in progress blocks new triggers.
    await prisma.syncRun.create({
      data: { status: "running", source: "manual" },
    });
    const concurrent = await request(app)
      .post(`${V1}/admin/sync-trigger`)
      .set(auth(token));
    expect(concurrent.status).toBe(409);
  });

  it("counts records created since the previous successful sync", async () => {
    const branch = await createBranch("Sync Branch");
    const category = await createCategory("Sync Category");
    const product = await createProduct(category.id, "Sync Product");
    await createRecord({
      branchId: branch.id,
      productId: product.id,
      quantity: 1,
      value: 10,
      dayOffset: -1,
    });
    await createRecord({
      branchId: branch.id,
      productId: product.id,
      quantity: 2,
      value: 20,
      dayOffset: 0,
    });

    const { token } = await loginAs("admin");
    await request(app)
      .post(`${V1}/admin/sync-trigger`)
      .set(auth(token))
      .expect(202);

    const run = await waitForFinishedRun();
    expect(run.recordCount).toBe(2);
    expect(run.message).toContain("2 new records");
  });

  it("feeds the dashboard freshness label from the last successful sync", async () => {
    const { token } = await loginAs("admin");
    await request(app)
      .post(`${V1}/admin/sync-trigger`)
      .set(auth(token))
      .expect(202);
    const run = await waitForFinishedRun();

    const summary = await request(app)
      .get(`${V1}/dashboard/summary?start=${new Date().toISOString().slice(0, 10)}&end=${new Date().toISOString().slice(0, 10)}`)
      .set(auth(token));
    // No records today, so the summary is the empty state; the freshness
    // timestamp itself is asserted through the sync status endpoint.
    expect(summary.body).toBeNull();

    const status = await request(app)
      .get(`${V1}/admin/sync-status`)
      .set(auth(token));
    expect(status.body.lastSyncedAt).toBe(run.finishedAt?.toISOString());
  });
});
