import type { Request, Response } from "express";

import { loginRequestSchema } from "../../src/shared/schemas/requests";
import { parseBody } from "../http/validation";
import * as authService from "../services/auth.service";

/** POST /api/v1/login (public). */
export async function login(req: Request, res: Response): Promise<void> {
  const credentials = parseBody(loginRequestSchema, req.body);
  const result = await authService.login(
    credentials.email,
    credentials.password,
  );
  res.json(result);
}

/** GET /api/v1/me — restores the session for a stored token. */
export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getSessionUser(req.authUser!.id);
  res.json(user);
}

/** POST /api/v1/logout — JWTs are stateless; the client drops the token. */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(204).end();
}
