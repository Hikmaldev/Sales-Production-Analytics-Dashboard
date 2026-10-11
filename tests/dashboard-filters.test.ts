import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  app,
  auth,
  loginAs,
  seedDashboardScenario,
  utcDay,
  V1,
} from "./helpers";

const range = (startOffset: number, endOffset = 0) =>
  `start=${utcDay(startOffset)}&end=${utcDay(endOffset)}`;

function sumPoints(body: { series: Array<{ points: Array<{ value: number }> }> }) {
  return body.series
    .flatMap((series) => series.points)
    .reduce((total, point) => total + point.value, 0);
}

/** 1 means every series shares the same bucket list (no gaps between lines). */
function alignedDateLists(body: {
  series: Array<{ points: Array<{ date: string }> }>;
}): number {
  return new Set(
    body.series.map((series) =>
      series.points.map((point) => point.date).join("|"),
    ),
  ).size;
}

describe("dashboard aggregation and filters (FR-CHT, FR-FLT, ACT-02..04)", () => {
  it("computes totals, average daily sales and period-over-period change", async () => {
    await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(`${V1}/dashboard/summary?${range(-6)}`)
      .set(auth(token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalSales: 800,
      totalUnits: 10,
      // 800 over 7 calendar days.
      avgDailySales: 114.29,
      // Previous period (day -13..-7) holds one record worth 400 with 2 units.
      change: { salesPct: 100, unitsPct: 400 },
    });
    expect(response.body.dataAsOf).toEqual(expect.any(String));
  });

  it("ignores records without a value for sales but still counts units", async () => {
    await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    // Day -20 row has value = null and quantity 4.
    const response = await request(app)
      .get(`${V1}/dashboard/summary?${range(-20, -20)}`)
      .set(auth(token));

    expect(response.body.totalSales).toBe(0);
    expect(response.body.totalUnits).toBe(4);
  });

  it("returns a null summary when the filter combination has no records", async () => {
    await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(`${V1}/dashboard/summary?${range(-120, -110)}`)
      .set(auth(token));

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  it("filters by branch", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(`${V1}/dashboard/summary?${range(-6)}&branch=${scenario.branchA.id}`)
      .set(auth(token));

    expect(response.body).toMatchObject({ totalSales: 300, totalUnits: 5 });
  });

  it("filters by category", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(
        `${V1}/dashboard/summary?${range(-6)}&category=${scenario.categoryY.id}`,
      )
      .set(auth(token));

    expect(response.body).toMatchObject({ totalSales: 200, totalUnits: 3 });
  });

  it("combines branch and category filters", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(
        `${V1}/dashboard/summary?${range(-6)}&branch=${scenario.branchA.id}&category=${scenario.categoryX.id}`,
      )
      .set(auth(token));

    expect(response.body).toMatchObject({ totalSales: 100, totalUnits: 2 });
  });

  it("accepts a comma-separated multi-branch filter", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(
        `${V1}/dashboard/summary?${range(-6)}&branch=${scenario.branchB.id},${scenario.branchA.id}`,
      )
      .set(auth(token));

    expect(response.body.totalSales).toBe(800);
  });

  it("rejects inverted and malformed date ranges with 400", async () => {
    const { token } = await loginAs("viewer");

    const inverted = await request(app)
      .get(`${V1}/dashboard/summary?start=${utcDay(0)}&end=${utcDay(-6)}`)
      .set(auth(token));
    expect(inverted.status).toBe(400);

    const malformed = await request(app)
      .get(`${V1}/dashboard/trend?start=not-a-date&end=${utcDay(0)}`)
      .set(auth(token));
    expect(malformed.status).toBe(400);
  });

  it("groups the trend by day for short ranges and returns one point per day", async () => {
    await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(`${V1}/dashboard/trend?${range(-6)}`)
      .set(auth(token));

    expect(response.body.granularity).toBe("day");
    const [seriesA, seriesB] = response.body.series;

    // Every series covers the whole range (no gaps in the line).
    expect(seriesA.points).toHaveLength(7);
    expect(seriesB.points).toHaveLength(7);
    expect(seriesA.points.map((point: { date: string }) => point.date)).toEqual(
      seriesB.points.map((point: { date: string }) => point.date),
    );

    const aByDate = new Map<string, number>(
      seriesA.points.map((point: { date: string; value: number }) => [
        point.date,
        point.value,
      ]),
    );
    expect(aByDate.get(utcDay(-2))).toBe(100);
    expect(aByDate.get(utcDay(-1))).toBe(200);
    expect(aByDate.get(utcDay(-6))).toBe(0);
    expect(aByDate.get(utcDay(0))).toBe(0);

    const bByDate = new Map<string, number>(
      seriesB.points.map((point: { date: string; value: number }) => [
        point.date,
        point.value,
      ]),
    );
    expect(bByDate.get(utcDay(-1))).toBe(500);
    expect(bByDate.get(utcDay(-2))).toBe(0);
  });

  it("zero-fills days without sales for the selected category", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    // Category X sold only on day -2 (Branch A) and day -1 (Branch B).
    const response = await request(app)
      .get(`${V1}/dashboard/trend?${range(-6)}&category=${scenario.categoryX.id}`)
      .set(auth(token));

    const [seriesA, seriesB] = response.body.series;
    expect(
      seriesA.points.filter((point: { value: number }) => point.value === 0),
    ).toHaveLength(6);
    expect(
      seriesB.points.filter((point: { value: number }) => point.value === 0),
    ).toHaveLength(6);
    expect(seriesA.points.map((point: { date: string }) => point.date)).toEqual(
      seriesB.points.map((point: { date: string }) => point.date),
    );
  });

  it("groups the trend by week and by month for longer ranges", async () => {
    await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const weekly = await request(app)
      .get(`${V1}/dashboard/trend?${range(-40)}`)
      .set(auth(token));
    expect(weekly.body.granularity).toBe("week");
    expect(sumPoints(weekly.body)).toBeCloseTo(2900, 2);
    expect(alignedDateLists(weekly.body)).toBe(1);

    const monthly = await request(app)
      .get(`${V1}/dashboard/trend?${range(-200)}`)
      .set(auth(token));
    expect(monthly.body.granularity).toBe("month");
    expect(sumPoints(monthly.body)).toBeCloseTo(2900, 2);
    expect(alignedDateLists(monthly.body)).toBe(1);
  });

  it("applies the category filter to the trend", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(`${V1}/dashboard/trend?${range(-40)}&category=${scenario.categoryX.id}`)
      .set(auth(token));

    // Product X records: 700 + 100 + 500.
    expect(sumPoints(response.body)).toBeCloseTo(1300, 2);
  });

  it("orders the branch comparison by sales and ignores the branch filter", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(`${V1}/dashboard/branch-comparison?${range(-6)}&branch=${scenario.branchA.id}`)
      .set(auth(token));

    expect(response.body.items).toEqual([
      {
        id: Number(scenario.branchB.id),
        name: "Branch B",
        totalSales: 500,
        totalUnits: 5,
      },
      {
        id: Number(scenario.branchA.id),
        name: "Branch A",
        totalSales: 300,
        totalUnits: 5,
      },
    ]);
  });

  it("applies the category filter to the branch comparison", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(
        `${V1}/dashboard/branch-comparison?${range(-6)}&category=${scenario.categoryX.id}`,
      )
      .set(auth(token));

    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(
      ["Branch B", "Branch A"],
    );
    expect(response.body.items[0].totalSales).toBe(500);
    expect(response.body.items[1].totalSales).toBe(100);
  });

  it("ignores the category filter in the category comparison and orders by sales", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(
        `${V1}/dashboard/category-comparison?${range(-6)}&category=${scenario.categoryX.id}`,
      )
      .set(auth(token));

    expect(response.body.items).toEqual([
      {
        id: Number(scenario.categoryX.id),
        name: "Category X",
        totalSales: 600,
        totalUnits: 7,
      },
      {
        id: Number(scenario.categoryY.id),
        name: "Category Y",
        totalSales: 200,
        totalUnits: 3,
      },
    ]);
  });

  it("applies the branch filter to the category comparison", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");

    const response = await request(app)
      .get(
        `${V1}/dashboard/category-comparison?${range(-6)}&branch=${scenario.branchA.id}`,
      )
      .set(auth(token));

    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(
      ["Category Y", "Category X"],
    );
    expect(response.body.items[0].totalSales).toBe(200);
    expect(response.body.items[1].totalSales).toBe(100);
  });

  it("shows identical data to viewers and admins (MVP: no per-branch restriction)", async () => {
    await seedDashboardScenario();
    const admin = await loginAs("admin");
    const viewer = await loginAs("viewer");

    const [adminSummary, viewerSummary, adminTrend, viewerTrend] =
      await Promise.all([
        request(app).get(`${V1}/dashboard/summary?${range(-6)}`).set(auth(admin.token)),
        request(app).get(`${V1}/dashboard/summary?${range(-6)}`).set(auth(viewer.token)),
        request(app).get(`${V1}/dashboard/trend?${range(-6)}`).set(auth(admin.token)),
        request(app).get(`${V1}/dashboard/trend?${range(-6)}`).set(auth(viewer.token)),
      ]);

    expect(viewerSummary.body).toEqual(adminSummary.body);
    expect(viewerTrend.body).toEqual(adminTrend.body);
  });

  it("requires authentication on every dashboard endpoint", async () => {
    const endpoints = [
      "summary",
      "trend",
      "branch-comparison",
      "category-comparison",
    ];

    for (const endpoint of endpoints) {
      const response = await request(app).get(
        `${V1}/dashboard/${endpoint}?${range(-6)}`,
      );
      expect(response.status).toBe(401);
    }
  });
});
