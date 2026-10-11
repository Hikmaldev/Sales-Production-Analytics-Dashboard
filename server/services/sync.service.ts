import type { SyncRun as PrismaSyncRun } from "../../generated/prisma/client";
import type {
  SyncRun,
  SyncStatusResponse,
  SyncTriggerResponse,
} from "../../src/shared/schemas/responses";
import { prisma } from "../db";
import { HttpError } from "../errors";

/**
 * ACT-08 — data freshness. The external pipeline that feeds sales_records is
 * out of scope (PRD §3), so the manual trigger runs a dataset check: it
 * counts records created since the last successful run and refreshes the
 * "last synced at" timestamp. When a real connector is added, only
 * runSyncJob() changes.
 */

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  const [running, latest, lastSuccess] = await Promise.all([
    prisma.syncRun.findFirst({ where: { status: "running" } }),
    prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.syncRun.findFirst({
      where: { status: "success", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
    }),
  ]);

  const status = running
    ? "syncing"
    : latest?.status === "failed"
      ? "failed"
      : "idle";

  return {
    status,
    lastSyncedAt: lastSuccess?.finishedAt?.toISOString() ?? null,
  };
}

export async function listSyncRuns(limit = 20): Promise<SyncRun[]> {
  const runs = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return runs.map(toSyncRunItem);
}

/** Starts a run and returns immediately; the UI polls GET /admin/sync-status. */
export async function triggerSync(userId: bigint): Promise<SyncTriggerResponse> {
  const running = await prisma.syncRun.findFirst({
    where: { status: "running" },
  });
  if (running) {
    throw new HttpError(409, "A sync is already running.");
  }

  const run = await prisma.syncRun.create({
    data: { status: "running", source: "manual", triggeredByUserId: userId },
  });

  // Run inline: serverless hosts (e.g. Vercel) may freeze the function right
  // after the response, so fire-and-forget background work is unreliable.
  await runSyncJob(run.id);

  return { status: "syncing", startedAt: run.startedAt.toISOString() };
}

async function runSyncJob(runId: bigint): Promise<void> {
  try {
    const lastSuccess = await prisma.syncRun.findFirst({
      where: { status: "success", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
    });

    const newRecords = await prisma.salesRecord.count({
      where: lastSuccess?.finishedAt
        ? { createdAt: { gt: lastSuccess.finishedAt } }
        : undefined,
    });

    await prisma.syncRun.update({
      where: { id: runId },
      data: {
        status: "success",
        finishedAt: new Date(),
        recordCount: newRecords,
        message:
          newRecords > 0
            ? `Detected ${newRecords} new records since the last sync.`
            : "No new records since the last sync.",
      },
    });
  } catch (error) {
    console.error("Sync job failed:", error);
    await prisma.syncRun
      .update({
        where: { id: runId },
        data: {
          status: "failed",
          finishedAt: new Date(),
          message: "The sync job failed. Check the server logs and try again.",
        },
      })
      .catch(() => undefined);
  }
}

/** Shared mapper so other services (e.g. file imports) return the same shape. */
export function toSyncRunItem(run: PrismaSyncRun): SyncRun {
  return {
    id: Number(run.id),
    status: run.status,
    source: run.source,
    recordCount: run.recordCount,
    message: run.message,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    durationSeconds: run.finishedAt
      ? Math.max(
          0,
          Math.round(
            (run.finishedAt.getTime() - run.startedAt.getTime()) / 1000,
          ),
        )
      : null,
  };
}
