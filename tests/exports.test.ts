import request from "supertest";
import type { Response as SuperAgentResponse } from "superagent";
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

type ParseCallback = (error: Error | null, body?: Buffer) => void;

function binaryParser(
  response: SuperAgentResponse,
  callback: ParseCallback,
): void {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer) => chunks.push(chunk));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
}

const emptyFilters = () => ({
  start: utcDay(-6),
  end: utcDay(0),
  branches: [] as number[],
  categories: [] as number[],
});

describe("exports (FR-EXP-01..03, ACT-06/07)", () => {
  it("generates a PDF and logs the exact filter snapshot", async () => {
    const scenario = await seedDashboardScenario();
    const { token } = await loginAs("viewer");
    const filters = {
      start: utcDay(-6),
      end: utcDay(0),
      branches: [Number(scenario.branchA.id)],
      categories: [] as number[],
    };

    const response = await request(app)
      .post(`${V1}/exports/pdf`)
      .set(auth(token))
      .send({ filters })
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain(
      `sales-report_${filters.start}_${filters.end}.pdf`,
    );
    const file = response.body as Buffer;
    expect(Buffer.isBuffer(file)).toBe(true);
    expect(file.subarray(0, 5).toString()).toBe("%PDF-");

    const log = await prisma.exportLog.findFirstOrThrow();
    expect(log.format).toBe("pdf");
    expect(log.status).toBe("success");
    expect(log.filterSnapshot).toEqual(filters);
  });

  it("generates an Excel workbook and logs it", async () => {
    await seedDashboardScenario();
    const { token } = await loginAs("viewer");
    const filters = emptyFilters();

    const response = await request(app)
      .post(`${V1}/exports/excel`)
      .set(auth(token))
      .send({ filters })
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "spreadsheetml.sheet",
    );
    expect(response.headers["content-disposition"]).toContain(".xlsx");
    const file = response.body as Buffer;
    // XLSX is a ZIP container.
    expect(file.subarray(0, 2).toString()).toBe("PK");

    const log = await prisma.exportLog.findFirstOrThrow();
    expect(log.format).toBe("excel");
    expect(log.status).toBe("success");
  });

  it("still produces a valid file when the filters match no data", async () => {
    const { token } = await loginAs("viewer");
    const filters = {
      start: utcDay(-90),
      end: utcDay(-80),
      branches: [] as number[],
      categories: [] as number[],
    };

    const response = await request(app)
      .post(`${V1}/exports/pdf`)
      .set(auth(token))
      .send({ filters })
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect((response.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await prisma.exportLog.findFirstOrThrow()).status).toBe("success");

    // The dashboard shows the shared empty state for the same filter set.
    const summary = await request(app)
      .get(`${V1}/dashboard/summary?start=${filters.start}&end=${filters.end}`)
      .set(auth(token));
    expect(summary.body).toBeNull();
  });

  it("validates the request body", async () => {
    const { token } = await loginAs("viewer");
    const response = await request(app)
      .post(`${V1}/exports/excel`)
      .set(auth(token))
      .send({
        filters: {
          start: "not-a-date",
          end: utcDay(0),
          branches: [],
          categories: [],
        },
      });
    expect(response.status).toBe(400);
    expect(await prisma.exportLog.count()).toBe(0);
  });

  it("scopes export history to the requesting user; admins see everything", async () => {
    const viewerA = await loginAs("viewer");
    const viewerB = await loginAs("viewer");
    const admin = await loginAs("admin");
    const filters = emptyFilters();

    await request(app)
      .post(`${V1}/exports/excel`)
      .set(auth(viewerA.token))
      .send({ filters })
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const ownA = await request(app)
      .get(`${V1}/exports/logs`)
      .set(auth(viewerA.token));
    expect(ownA.body).toHaveLength(1);

    const ownB = await request(app)
      .get(`${V1}/exports/logs`)
      .set(auth(viewerB.token));
    expect(ownB.body).toHaveLength(0);

    const all = await request(app)
      .get(`${V1}/exports/logs`)
      .set(auth(admin.token));
    expect(all.body).toHaveLength(1);
    expect(all.body[0]).toMatchObject({
      userId: Number(viewerA.user.id),
      format: "excel",
      status: "success",
    });
  });

  it("requires authentication for generation and history", async () => {
    const generate = await request(app)
      .post(`${V1}/exports/pdf`)
      .send({ filters: emptyFilters() });
    expect(generate.status).toBe(401);

    const logs = await request(app).get(`${V1}/exports/logs`);
    expect(logs.status).toBe(401);
  });
});
