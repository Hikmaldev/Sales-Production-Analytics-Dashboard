import type { Request, Response } from "express";

import {
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
} from "../../src/shared/schemas/requests";
import { parseBody, parseIdParam } from "../http/validation";
import * as categoriesService from "../services/categories.service";

/** GET /api/v1/product-categories?active=true — filter options / admin table. */
export async function list(req: Request, res: Response): Promise<void> {
  const activeOnly = req.query.active === "true";
  res.json(await categoriesService.listCategories({ activeOnly }));
}

/** POST /api/v1/product-categories (admin). */
export async function create(req: Request, res: Response): Promise<void> {
  const input = parseBody(createCategoryRequestSchema, req.body);
  res.status(201).json(await categoriesService.createCategory(input));
}

/** ACT-10 — PATCH /api/v1/product-categories/{id} (admin). */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseIdParam(req.params.id);
  const input = parseBody(updateCategoryRequestSchema, req.body);
  res.json(await categoriesService.updateCategoryActive(id, input.isActive));
}
