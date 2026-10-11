import type { Request, Response } from "express";

import {
  createBranchRequestSchema,
  updateBranchRequestSchema,
} from "../../src/shared/schemas/requests";
import { parseBody, parseIdParam } from "../http/validation";
import * as branchesService from "../services/branches.service";

/** GET /api/v1/branches?active=true — filter options / admin table. */
export async function list(req: Request, res: Response): Promise<void> {
  const activeOnly = req.query.active === "true";
  res.json(await branchesService.listBranches({ activeOnly }));
}

/** POST /api/v1/branches (admin). */
export async function create(req: Request, res: Response): Promise<void> {
  const input = parseBody(createBranchRequestSchema, req.body);
  res.status(201).json(await branchesService.createBranch(input));
}

/** ACT-10 — PATCH /api/v1/branches/{id} (admin). */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseIdParam(req.params.id);
  const input = parseBody(updateBranchRequestSchema, req.body);
  res.json(await branchesService.updateBranchActive(id, input.isActive));
}
