import type { Request, Response } from "express";

import * as syncService from "../services/sync.service";

/** ACT-08 — GET /api/v1/admin/sync-status (admin, polled by the UI). */
export async function getStatus(_req: Request, res: Response): Promise<void> {
  res.json(await syncService.getSyncStatus());
}

/** GET /api/v1/admin/sync-runs — sync history table (admin). */
export async function listRuns(_req: Request, res: Response): Promise<void> {
  res.json(await syncService.listSyncRuns());
}

/** ACT-08 — POST /api/v1/admin/sync-trigger (admin). */
export async function trigger(req: Request, res: Response): Promise<void> {
  const result = await syncService.triggerSync(req.authUser!.id);
  res.status(202).json(result);
}
