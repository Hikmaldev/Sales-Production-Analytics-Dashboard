import type { Request, Response } from "express";

import { createUserRequestSchema } from "../../src/shared/schemas/requests";
import { parseBody } from "../http/validation";
import * as usersService from "../services/users.service";

/** GET /api/v1/users (admin). */
export async function list(_req: Request, res: Response): Promise<void> {
  res.json(await usersService.listUsers());
}

/** ACT-09 — POST /api/v1/users (admin). */
export async function create(req: Request, res: Response): Promise<void> {
  const input = parseBody(createUserRequestSchema, req.body);
  res.status(201).json(await usersService.createUser(input));
}
